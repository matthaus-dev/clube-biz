import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getEnv } from "@/lib/env";
import { hashOpaqueToken, keyedHash } from "@/lib/security/hash";
import { normalizePhone } from "@/modules/customers/domain/identity";
import { claimStaticQr } from "@/modules/qr-codes/application/claim-static-qr";
import { startBalanceChallenge, verifyBalanceChallenge } from "@/modules/loyalty/application/balance-challenge";
import { deliverOtp } from "@/modules/loyalty/infrastructure/otp-delivery";
import { dispatchWelcomeMessage } from "@/modules/loyalty/application/welcome-message";
import { sendEvolutionText } from "@/modules/loyalty/infrastructure/evolution-message";

vi.mock("@/modules/loyalty/infrastructure/otp-delivery", () => ({ deliverOtp: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/modules/loyalty/infrastructure/evolution-message", () => ({ sendEvolutionText: vi.fn().mockResolvedValue(undefined) }));

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const merchantSlug = `integration-${suffix}`;
const token = `integration-qr-token-${randomUUID()}`;
let merchantId: string;
let campaignId: string;
const merchantIds: string[] = [];
const campaignIds: string[] = [];

function lastDeliveredOtp(): string {
  const call = vi.mocked(deliverOtp).mock.calls.at(-1);
  if (!call) throw new Error("OTP_NOT_DELIVERED");
  return call[1];
}

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
  await prisma.messageDelivery.deleteMany({ where: { customerId: { in: customerIds } } });
  await prisma.customerConsent.deleteMany({ where: { customerId: { in: customerIds } } });
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
    const completedInput = { ...input, firstName: "Cliente", whatsappConsent: true };
    const first = await claimStaticQr(prisma, completedInput);
    const retry = await claimStaticQr(prisma, completedInput);

    expect(lookup.status).toBe("needs_registration");
    const { welcomeMessageId, ...firstPublicResult } = first;
    const { welcomeMessageId: retryWelcomeMessageId, ...retryPublicResult } = retry;
    expect(firstPublicResult).toEqual(retryPublicResult);
    expect(welcomeMessageId).toBeDefined();
    expect(retryWelcomeMessageId).toBeUndefined();
    expect(first).toMatchObject({ status: "credited", pointsAdded: 1, balance: 1 });
    expect(await prisma.pointTransaction.count({ where: { campaignId, idempotencyKey } })).toBe(1);

    const delivery = await prisma.messageDelivery.findFirstOrThrow({ where: { customer: { phoneHash: keyedHash(normalizePhone(input.phone), getEnv().PII_HASH_PEPPER) } } });
    expect(await dispatchWelcomeMessage(prisma, delivery.id)).toBe("sent");
    expect(await dispatchWelcomeMessage(prisma, delivery.id)).toBe("skipped");
    expect(sendEvolutionText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEvolutionText).mock.calls[0][1]).toContain("/saldo");
  });

  it("keeps a successful claim when the welcome delivery fails", async () => {
    const phone = "11980000007";
    const result = await claimStaticQr(prisma, {
      token,
      phone,
      firstName: "Cliente",
      whatsappConsent: true,
      idempotencyKey: randomUUID(),
    });
    const phoneHash = keyedHash(normalizePhone(phone), getEnv().PII_HASH_PEPPER);
    const delivery = await prisma.messageDelivery.findFirstOrThrow({ where: { customer: { phoneHash } } });
    vi.mocked(sendEvolutionText).mockRejectedValueOnce(new Error("provider failure"));

    expect(await dispatchWelcomeMessage(prisma, delivery.id)).toBe("failed");
    expect(await prisma.messageDelivery.findUnique({ where: { id: delivery.id } })).toMatchObject({ status: "FAILED", attempts: 1 });
    expect(result.status).toBe("credited");
    expect(await prisma.pointTransaction.count({ where: { membership: { customer: { phoneHash } } } })).toBe(1);
  });

  it("credits at most once under concurrent requests", async () => {
    const now = new Date("2026-08-26T16:00:00.000Z");
    const results = await Promise.all([
      claimStaticQr(prisma, { token, phone: "11980000002", firstName: "Cliente", whatsappConsent: true, idempotencyKey: randomUUID(), now }),
      claimStaticQr(prisma, { token, phone: "11980000002", firstName: "Cliente", whatsappConsent: true, idempotencyKey: randomUUID(), now }),
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
    const base = { token, phone, firstName: "Cliente", whatsappConsent: true };
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
    const code = lastDeliveredOtp();
    expect(code).toMatch(/^\d{6}$/);
    const result = await verifyBalanceChallenge(prisma, {
      challengeId: challenge.challengeId,
      code,
      now: new Date("2026-08-26T17:01:00Z"),
    });
    expect(result.balance).toBe(1);
    expect(result.history).toHaveLength(1);
  });

  it("persists failed attempts and blocks after five incorrect codes", async () => {
    const challenge = await startBalanceChallenge(prisma, { phone: "11980000001" });
    const code = lastDeliveredOtp();
    const wrongCode = code === "000000" ? "000001" : "000000";
    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(verifyBalanceChallenge(prisma, { challengeId: challenge.challengeId, code: wrongCode })).rejects.toThrow("INVALID_CHALLENGE");
      expect(await prisma.identityChallenge.findUnique({ where: { id: challenge.challengeId } })).toMatchObject({ attempts: attempt, status: attempt === 5 ? "BLOCKED" : "PENDING" });
    }
    await expect(verifyBalanceChallenge(prisma, { challengeId: challenge.challengeId, code })).rejects.toThrow("INVALID_CHALLENGE");
  });

  it("persists expiration and accepts only one concurrent verification", async () => {
    const now = new Date();
    const expired = await startBalanceChallenge(prisma, { phone: "11980000001", now });
    const expiredCode = lastDeliveredOtp();
    await expect(verifyBalanceChallenge(prisma, { challengeId: expired.challengeId, code: expiredCode, now: new Date(now.getTime() + 300_000) })).rejects.toThrow("INVALID_CHALLENGE");
    expect(await prisma.identityChallenge.findUnique({ where: { id: expired.challengeId } })).toMatchObject({ status: "EXPIRED" });
    const active = await startBalanceChallenge(prisma, { phone: "11980000001" });
    const activeCode = lastDeliveredOtp();
    const results = await Promise.allSettled([1, 2].map(() => verifyBalanceChallenge(prisma, { challengeId: active.challengeId, code: activeCode })));
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

  it("requires explicit WhatsApp consent before creating a public customer", async () => {
    const phone = "11980000005";
    await expect(claimStaticQr(prisma, { token, phone, firstName: "Cliente", idempotencyKey: randomUUID() })).rejects.toThrow("CONSENT_REQUIRED");
    const phoneHash = keyedHash(normalizePhone(phone), getEnv().PII_HASH_PEPPER);
    expect(await prisma.customer.findUnique({ where: { phoneHash } })).toBeNull();
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
    const first = await claimStaticQr(prisma, { token, phone, firstName: "Cliente", whatsappConsent: true, idempotencyKey: randomUUID() });
    const second = await claimStaticQr(prisma, { token: secondToken, phone, idempotencyKey: randomUUID() });
    const phoneHash = keyedHash(normalizePhone(phone), getEnv().PII_HASH_PEPPER);
    const memberships = await prisma.membership.findMany({
      where: { campaignId: { in: [campaignId, secondCampaign.id] }, customer: { phoneHash } },
      orderBy: { createdAt: "desc" },
      select: { campaignId: true, customerId: true },
    });

    expect(first.status).toBe("credited");
    expect(second.status).toBe("credited");
    expect(new Set(memberships.map((membership) => membership.customerId)).size).toBe(1);
    expect(new Set(memberships.map((membership) => membership.campaignId))).toEqual(new Set([campaignId, secondCampaign.id]));
    expect(await prisma.messageDelivery.count({ where: { customerId: memberships[0].customerId } })).toBe(1);
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
