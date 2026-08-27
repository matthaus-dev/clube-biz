import { randomUUID } from "node:crypto";
import { PrismaClient, type MerchantRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MerchantSession } from "@/modules/auth/infrastructure/session";
import { createManualCredit } from "@/modules/loyalty/application/manual-points";
import { createRedemption, cancelRedemption } from "@/modules/rewards/application/redemptions";
import { listMerchantCustomers } from "@/modules/merchants/application/dashboard-queries";

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const merchantIds: string[] = [];
const campaignIds: string[] = [];
let ownerA: MerchantSession;
let attendantA: MerchantSession;
let ownerB: MerchantSession;
let rewardId: string;

function session(userId: string, merchantId: string, role: MerchantRole, slug: string): MerchantSession {
  return { sessionId: "test", userId, merchantId, merchantName: slug, merchantSlug: slug, timezone: "America/Sao_Paulo", role, email: `${role.toLowerCase()}@test.local` };
}

beforeAll(async () => {
  for (const side of ["a", "b"] as const) {
    const merchant = await prisma.merchant.create({ data: { name: `Tenant ${side}`, slug: `s2-${side}-${suffix}` } });
    merchantIds.push(merchant.id);
    const campaign = await prisma.campaign.create({ data: { merchantId: merchant.id, name: `Campaign ${side}`, status: "ACTIVE", pointsPerClaim: 1, rewardThreshold: 10, rewardTitle: "Reward", claimCooldownHours: 0, dailyClaimLimit: 20 } });
    campaignIds.push(campaign.id);
    const owner = await prisma.merchantUser.create({ data: { merchantId: merchant.id, name: `Owner ${side}`, emailNormalized: `owner-${side}@test.local`, role: "OWNER", status: "ACTIVE" } });
    if (side === "a") {
      const attendant = await prisma.merchantUser.create({ data: { merchantId: merchant.id, name: "Atendente", emailNormalized: "attendant@test.local", role: "ATTENDANT", status: "ACTIVE" } });
      ownerA = session(owner.id, merchant.id, "OWNER", merchant.slug);
      attendantA = session(attendant.id, merchant.id, "ATTENDANT", merchant.slug);
      const reward = await prisma.reward.create({ data: { campaignId: campaign.id, name: "Reward", pointsCost: 10 } });
      rewardId = reward.id;
    } else ownerB = session(owner.id, merchant.id, "OWNER", merchant.slug);
  }
});

afterAll(async () => {
  const memberships = await prisma.membership.findMany({ where: { campaignId: { in: campaignIds } }, select: { customerId: true } });
  const customerIds = memberships.map((item) => item.customerId);
  await prisma.session.deleteMany({ where: { merchantUser: { merchantId: { in: merchantIds } } } });
  await prisma.auditLog.deleteMany({ where: { merchantId: { in: merchantIds } } });
  await prisma.qrClaim.deleteMany({ where: { qrCode: { campaignId: { in: campaignIds } } } });
  await prisma.pointTransaction.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.redemption.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.membership.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.qrCode.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.reward.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
  await prisma.merchantUser.deleteMany({ where: { merchantId: { in: merchantIds } } });
  await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
  if (customerIds.length) await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.$disconnect();
});

describe("Sprint 2 merchant operations", () => {
  it("keeps manual credit idempotent and isolated by tenant", async () => {
    const idempotencyKey = randomUUID();
    const input = { phone: "11982220001", points: 3, reason: "Compra balcão", idempotencyKey, requestId: randomUUID() };
    const first = await createManualCredit(prisma, ownerA, input);
    const retry = await createManualCredit(prisma, ownerA, input);
    expect(first.membership.balance).toBe(3);
    expect(retry.membership.balance).toBe(3);
    expect(await prisma.pointTransaction.count({ where: { merchantId: ownerA.merchantId, idempotencyKey } })).toBe(1);
    expect((await listMerchantCustomers(ownerB.merchantId)).customers).toHaveLength(0);
  });

  it("enforces the attendant credit limit", async () => {
    await expect(createManualCredit(prisma, attendantA, { phone: "11982220002", points: 2, reason: "Compra balcão", idempotencyKey: randomUUID(), requestId: randomUUID() })).rejects.toThrow("POINT_LIMIT_EXCEEDED");
  });

  it("allows only one concurrent redemption for the available balance", async () => {
    const credit = await createManualCredit(prisma, ownerA, { phone: "11982220003", points: 10, reason: "Carga teste", idempotencyKey: randomUUID(), requestId: randomUUID() });
    const attempts = await Promise.allSettled([
      createRedemption(prisma, ownerA, { membershipId: credit.membership.id, rewardId, idempotencyKey: randomUUID(), requestId: randomUUID() }),
      createRedemption(prisma, ownerA, { membershipId: credit.membership.id, rewardId, idempotencyKey: randomUUID(), requestId: randomUUID() }),
    ]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((item) => item.status === "rejected")).toHaveLength(1);
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: credit.membership.id } })).balance).toBe(0);

    const redemption = await prisma.redemption.findFirstOrThrow({ where: { membershipId: credit.membership.id, status: "CONFIRMED" } });
    await expect(cancelRedemption(prisma, attendantA, { redemptionId: redemption.id, reason: "Teste", idempotencyKey: randomUUID(), requestId: randomUUID() })).rejects.toThrow("FORBIDDEN");
    await cancelRedemption(prisma, ownerA, { redemptionId: redemption.id, reason: "Cancelamento teste", idempotencyKey: randomUUID(), requestId: randomUUID() });
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: credit.membership.id } })).balance).toBe(10);
  });

  it("rejects a reward belonging to another tenant", async () => {
    const otherReward = await prisma.reward.create({ data: { campaignId: campaignIds[1], name: "Other", pointsCost: 1 } });
    const membership = await prisma.membership.findFirstOrThrow({ where: { campaignId: campaignIds[0] } });
    await expect(createRedemption(prisma, ownerA, { membershipId: membership.id, rewardId: otherReward.id, idempotencyKey: randomUUID(), requestId: randomUUID() })).rejects.toThrow("REDEMPTION_NOT_FOUND");
  });
});
