import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getEnv } from "@/lib/env";
import { hashOpaqueToken, keyedHash } from "@/lib/security/hash";
import { normalizePhone } from "@/modules/customers/domain/identity";
import { claimStaticQr } from "@/modules/qr-codes/application/claim-static-qr";
import { startBalanceChallenge, verifyBalanceChallenge } from "@/modules/loyalty/application/balance-challenge";
import { deliverOtp } from "@/modules/loyalty/infrastructure/otp-delivery";

vi.mock("@/modules/loyalty/infrastructure/otp-delivery", () => ({ deliverOtp: vi.fn().mockResolvedValue(undefined) }));

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const merchantSlug = `integration-${suffix}`;
const token = `integration-qr-token-${randomUUID()}`;
let merchantId: string;
let campaignId: string;
const merchantIds: string[] = [];
const campaignIds: string[] = [];

beforeAll(async () => {
  const merchant = await prisma.merchant.create({
    data: { name: "Integration Merchant", slug: merchantSlug, timezone: "America/Sao_Paulo" },
  });
  merchantId = merchant.id;
  merchantIds.push(merchant.id);
  const campaign = await prisma.campaign.create({
    data: {
      merchantId,
      name: "Integration Campaign",
      status: "ACTIVE",
      pointsPerClaim: 1,
      rewardThreshold: 10,
      rewardTitle: "Reward",
      claimCooldownHours: 12,
      dailyClaimLimit: 2,
    },
  });
  campaignId = campaign.id;
  campaignIds.push(campaign.id);
  await prisma.qrCode.create({
    data: {
      merchantId,
      campaignId,
      kind: "STATIC",
      tokenHash: hashOpaqueToken(token),
      points: 1,
    },
  });
});

afterAll(async () => {
  const memberships = await prisma.membership.findMany({ where: { campaignId: { in: campaignIds } }, select: { customerId: true } });
  const customerIds = memberships.map((item) => item.customerId);
  await prisma.identityChallenge.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.qrClaim.deleteMany({ where: { qrCode: { campaignId: { in: campaignIds } } } });
  await prisma.pointTransaction.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.membership.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.qrCode.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.reward.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
  await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
  if (customerIds.length) await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.$disconnect();
});

describe("loyalty with PostgreSQL", () => {
  it("returns the original result for an idempotent retry", async () => {
    const idempotencyKey = randomUUID();
    const input = {
      token,
      phone: "11980000001",
      idempotencyKey,
      now: new Date("2026-08-26T15:00:00.000Z"),
    };
    const lookup = await claimStaticQr(prisma, input);
    const completedInput = { ...input, firstName: "Cliente" };
    const first = await claimStaticQr(prisma, completedInput);
    const retry = await claimStaticQr(prisma, completedInput);

    expect(lookup.status).toBe("needs_registration");
    expect(first).toEqual(retry);
    expect(first).toMatchObject({ status: "credited", pointsAdded: 1, balance: 1 });
    expect(await prisma.pointTransaction.count({ where: { campaignId, idempotencyKey } })).toBe(1);
  });

  it("credits at most once under concurrent requests", async () => {
    const now = new Date("2026-08-26T16:00:00.000Z");
    const results = await Promise.all([
      claimStaticQr(prisma, { token, phone: "11980000002", firstName: "Cliente", idempotencyKey: randomUUID(), now }),
      claimStaticQr(prisma, { token, phone: "11980000002", firstName: "Cliente", idempotencyKey: randomUUID(), now }),
    ]);

    expect(results.filter((result) => result.status === "credited")).toHaveLength(1);
    expect(results.filter((result) => result.status === "blocked")).toHaveLength(1);
    const membership = await prisma.membership.findFirstOrThrow({
      where: { campaignId, customer: { phoneHash: { not: null } } },
      orderBy: { createdAt: "desc" },
    });
    expect(membership.balance).toBe(1);
  });

  it("enforces the daily limit using the merchant timezone", async () => {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { claimCooldownHours: 0, dailyClaimLimit: 2 },
    });
    const phone = "11980000003";
    const base = { token, phone, firstName: "Cliente" };
    const first = await claimStaticQr(prisma, { ...base, idempotencyKey: randomUUID(), now: new Date("2026-08-26T12:00:00Z") });
    const second = await claimStaticQr(prisma, { ...base, idempotencyKey: randomUUID(), now: new Date("2026-08-26T13:00:00Z") });
    const third = await claimStaticQr(prisma, { ...base, idempotencyKey: randomUUID(), now: new Date("2026-08-26T14:00:00Z") });

    expect([first.status, second.status, third.status]).toEqual(["credited", "credited", "blocked"]);
    expect(third.reason).toContain("limite");
  });

  it("verifies an OTP before returning the campaign balance", async () => {
    const challenge = await startBalanceChallenge(prisma, {
      merchantSlug,
      phone: "11980000001",
      now: new Date("2026-08-26T17:00:00Z"),
    });
    expect(challenge.devCode).toMatch(/^\d{6}$/);
    const result = await verifyBalanceChallenge(prisma, {
      challengeId: challenge.challengeId,
      code: challenge.devCode!,
      now: new Date("2026-08-26T17:01:00Z"),
    });
    expect(result.balance).toBe(1);
    expect(result.history).toHaveLength(1);
  });

  it("persists failed attempts and blocks after five incorrect codes", async () => {
    const challenge = await startBalanceChallenge(prisma, { phone: "11980000001" });
    const wrongCode = challenge.devCode === "000000" ? "000001" : "000000";
    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(verifyBalanceChallenge(prisma, { challengeId: challenge.challengeId, code: wrongCode })).rejects.toThrow("INVALID_CHALLENGE");
      expect(await prisma.identityChallenge.findUnique({ where: { id: challenge.challengeId } })).toMatchObject({ attempts: attempt, status: attempt === 5 ? "BLOCKED" : "PENDING" });
    }
    await expect(verifyBalanceChallenge(prisma, { challengeId: challenge.challengeId, code: challenge.devCode! })).rejects.toThrow("INVALID_CHALLENGE");
  });

  it("persists expiration and accepts only one concurrent verification", async () => {
    const now = new Date();
    const expired = await startBalanceChallenge(prisma, { phone: "11980000001", now });
    await expect(verifyBalanceChallenge(prisma, { challengeId: expired.challengeId, code: expired.devCode!, now: new Date(now.getTime() + 300_000) })).rejects.toThrow("INVALID_CHALLENGE");
    expect(await prisma.identityChallenge.findUnique({ where: { id: expired.challengeId } })).toMatchObject({ status: "EXPIRED" });
    const active = await startBalanceChallenge(prisma, { phone: "11980000001" });
    const results = await Promise.allSettled([1, 2].map(() => verifyBalanceChallenge(prisma, { challengeId: active.challengeId, code: active.devCode! })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("persists a WhatsApp challenge before sending and never returns its code", async () => {
    const env = getEnv();
    const previousMode = env.OTP_DELIVERY_MODE;
    env.OTP_DELIVERY_MODE = "evolution";
    vi.mocked(deliverOtp).mockImplementationOnce(async (phone, code) => {
      expect(phone).toBe("+5511980000001");
      const persisted = await prisma.identityChallenge.findFirstOrThrow({ where: { campaignId }, orderBy: { createdAt: "desc" } });
      expect(persisted.channel).toBe("WHATSAPP");
      expect(persisted.codeHash).toBe(keyedHash(`${persisted.id}:${code}`, env.PII_HASH_PEPPER));
    });
    try {
      const result = await startBalanceChallenge(prisma, { phone: "11980000001" });
      expect(result.devCode).toBeUndefined();
    } finally {
      env.OTP_DELIVERY_MODE = previousMode;
    }
  });

  it("blocks the persisted challenge if delivery fails", async () => {
    vi.mocked(deliverOtp).mockRejectedValueOnce(new Error("provider failure"));
    await expect(startBalanceChallenge(prisma, { phone: "11980000001" })).rejects.toThrow("OTP_DELIVERY_UNAVAILABLE");
    const challenge = await prisma.identityChallenge.findFirstOrThrow({ where: { campaignId }, orderBy: { createdAt: "desc" } });
    expect(challenge.status).toBe("BLOCKED");
  });

  it("rejects another phone paired with an existing customer's CPF", async () => {
    await claimStaticQr(prisma, { token, phone: "11980000005", cpf: "52998224725", firstName: "Cliente", idempotencyKey: randomUUID() });
    vi.mocked(deliverOtp).mockClear();
    await expect(startBalanceChallenge(prisma, { phone: "11980000006", cpf: "52998224725" })).rejects.toThrow("CUSTOMER_UNAVAILABLE");
    expect(deliverOtp).not.toHaveBeenCalled();
  });

  it("links the same customer to more than one merchant", async () => {
    const secondToken = `integration-qr-token-2-${randomUUID()}`;
    const secondMerchant = await prisma.merchant.create({
      data: { name: "Second Merchant", slug: `integration-second-${suffix}`, timezone: "America/Sao_Paulo" },
    });
    merchantIds.push(secondMerchant.id);
    const secondCampaign = await prisma.campaign.create({
      data: {
        merchantId: secondMerchant.id,
        name: "Second Campaign",
        status: "ACTIVE",
        pointsPerClaim: 1,
        rewardThreshold: 10,
        rewardTitle: "Reward",
        claimCooldownHours: 0,
        dailyClaimLimit: 2,
      },
    });
    campaignIds.push(secondCampaign.id);
    await prisma.qrCode.create({
      data: {
        merchantId: secondMerchant.id,
        campaignId: secondCampaign.id,
        kind: "STATIC",
        tokenHash: hashOpaqueToken(secondToken),
        points: 1,
      },
    });

    const phone = "11980000004";
    const first = await claimStaticQr(prisma, { token, phone, firstName: "Cliente", idempotencyKey: randomUUID() });
    const lookup = await claimStaticQr(prisma, { token: secondToken, phone, idempotencyKey: randomUUID() });
    const second = await claimStaticQr(prisma, { token: secondToken, phone, firstName: "Cliente", idempotencyKey: randomUUID() });
    const phoneHash = keyedHash(normalizePhone(phone), getEnv().PII_HASH_PEPPER);
    const memberships = await prisma.membership.findMany({
      where: { campaignId: { in: [campaignId, secondCampaign.id] }, customer: { phoneHash } },
      orderBy: { createdAt: "desc" },
      select: { campaignId: true, customerId: true },
    });

    expect(first.status).toBe("credited");
    expect(lookup.status).toBe("needs_registration");
    expect(second.status).toBe("credited");
    expect(new Set(memberships.map((membership) => membership.customerId)).size).toBe(1);
    expect(new Set(memberships.map((membership) => membership.campaignId))).toEqual(new Set([campaignId, secondCampaign.id]));
  });

  it("keeps the materialized balance reconciled with the ledger", async () => {
    const memberships = await prisma.membership.findMany({
      where: { campaignId },
      include: { transactions: { where: { status: "POSTED" } } },
    });
    for (const membership of memberships) {
      const ledgerBalance = membership.transactions.reduce((sum, transaction) => sum + transaction.pointsDelta, 0);
      expect(membership.balance).toBe(ledgerBalance);
    }
  });
});
