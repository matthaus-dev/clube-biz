import type { PrismaClient } from "@prisma/client";
import type { MerchantSession } from "@/modules/auth/infrastructure/session";
import { assertPermission } from "@/modules/auth/domain/permissions";
import { withSerializableRetry } from "@/lib/db/transaction";
import { postPointTransaction } from "@/modules/loyalty/application/point-ledger";

export async function createRedemption(
  prisma: PrismaClient,
  session: MerchantSession,
  input: { membershipId: string; rewardId: string; idempotencyKey: string; requestId: string },
) {
  assertPermission(session.role, "redemptions:create");
  return withSerializableRetry(prisma, async (tx) => {
    const existing = await tx.redemption.findUnique({
      where: {
        merchantId_idempotencyKey: { merchantId: session.merchantId, idempotencyKey: input.idempotencyKey },
      },
    });
    if (existing) return existing;

    const membership = await tx.membership.findFirst({
      where: { id: input.membershipId, campaign: { merchantId: session.merchantId } },
    });
    const reward = await tx.reward.findFirst({
      where: { id: input.rewardId, status: "ACTIVE", campaign: { merchantId: session.merchantId, status: "ACTIVE" } },
    });
    if (!membership || !reward || membership.campaignId !== reward.campaignId) throw new Error("REDEMPTION_NOT_FOUND");
    if (membership.balance < reward.pointsCost) throw new Error("INSUFFICIENT_BALANCE");

    const redemption = await tx.redemption.create({
      data: {
        merchantId: session.merchantId,
        campaignId: reward.campaignId,
        membershipId: membership.id,
        rewardId: reward.id,
        pointsSpent: reward.pointsCost,
        idempotencyKey: input.idempotencyKey,
        actorMerchantUserId: session.userId,
      },
    });
    await postPointTransaction(tx, {
      merchantId: session.merchantId,
      campaignId: reward.campaignId,
      membershipId: membership.id,
      type: "REDEEM",
      source: "MANUAL",
      pointsDelta: -reward.pointsCost,
      idempotencyKey: `redeem:${input.idempotencyKey}`,
      redemptionId: redemption.id,
      actorMerchantUserId: session.userId,
    });
    await tx.auditLog.create({
      data: {
        merchantId: session.merchantId,
        actorMerchantUserId: session.userId,
        action: "REWARD_REDEEMED",
        entityType: "Redemption",
        entityId: redemption.id,
        metadata: { rewardId: reward.id, pointsSpent: reward.pointsCost },
        requestId: input.requestId,
      },
    });
    return redemption;
  });
}

export async function cancelRedemption(
  prisma: PrismaClient,
  session: MerchantSession,
  input: { redemptionId: string; reason: string; idempotencyKey: string; requestId: string },
) {
  assertPermission(session.role, "redemptions:cancel");
  return withSerializableRetry(prisma, async (tx) => {
    const redemption = await tx.redemption.findFirst({
      where: { id: input.redemptionId, merchantId: session.merchantId },
      include: { pointTransaction: true },
    });
    if (!redemption) throw new Error("REDEMPTION_NOT_FOUND");
    if (redemption.status === "CANCELLED") return redemption;
    if (!redemption.pointTransaction) throw new Error("REDEMPTION_LEDGER_MISSING");

    await postPointTransaction(tx, {
      merchantId: session.merchantId,
      campaignId: redemption.campaignId,
      membershipId: redemption.membershipId,
      type: "REVERSAL",
      source: "MANUAL",
      pointsDelta: redemption.pointsSpent,
      idempotencyKey: input.idempotencyKey,
      reasonCode: input.reason,
      actorMerchantUserId: session.userId,
      reversesTransactionId: redemption.pointTransaction.id,
    });
    const cancelled = await tx.redemption.update({
      where: { id: redemption.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        merchantId: session.merchantId,
        actorMerchantUserId: session.userId,
        action: "REDEMPTION_CANCELLED",
        entityType: "Redemption",
        entityId: redemption.id,
        metadata: { reason: input.reason },
        requestId: input.requestId,
      },
    });
    return cancelled;
  });
}
