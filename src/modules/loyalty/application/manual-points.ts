import type { PrismaClient } from "@prisma/client";
import type { MerchantSession } from "@/modules/auth/infrastructure/session";
import { assertPermission, manualCreditLimit } from "@/modules/auth/domain/permissions";
import { findOrCreateCustomer, protectIdentity } from "@/modules/customers/application/customer-identity";
import { withSerializableRetry } from "@/lib/db/transaction";
import { postPointTransaction } from "./point-ledger";

export type ManualCreditInput = {
  phone: string;
  cpf?: string;
  points: number;
  reason: string;
  idempotencyKey: string;
  requestId: string;
};

export async function createManualCredit(
  prisma: PrismaClient,
  session: MerchantSession,
  input: ManualCreditInput,
) {
  assertPermission(session.role, "points:create");
  const identity = protectIdentity(input.phone, input.cpf);

  return withSerializableRetry(prisma, async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: { merchantId: session.merchantId, status: "ACTIVE" },
    });
    if (!campaign) throw new Error("CAMPAIGN_UNAVAILABLE");
    if (!Number.isSafeInteger(input.points) || input.points < 1) throw new Error("INVALID_POINTS");
    if (input.points > manualCreditLimit(session.role, campaign.pointsPerClaim)) throw new Error("POINT_LIMIT_EXCEEDED");

    const existing = await tx.pointTransaction.findUnique({
      where: {
        merchantId_idempotencyKey: { merchantId: session.merchantId, idempotencyKey: input.idempotencyKey },
      },
      include: { membership: true },
    });
    if (existing) return { transaction: existing, membership: existing.membership, duplicate: true };

    const customer = await findOrCreateCustomer(tx, identity);
    const membership = await tx.membership.upsert({
      where: { campaignId_customerId: { campaignId: campaign.id, customerId: customer.id } },
      create: { campaignId: campaign.id, customerId: customer.id },
      update: {},
    });
    const result = await postPointTransaction(tx, {
      merchantId: session.merchantId,
      campaignId: campaign.id,
      membershipId: membership.id,
      type: "EARN",
      source: "MANUAL",
      pointsDelta: input.points,
      idempotencyKey: input.idempotencyKey,
      reasonCode: input.reason,
      actorMerchantUserId: session.userId,
    });
    await tx.auditLog.create({
      data: {
        merchantId: session.merchantId,
        actorMerchantUserId: session.userId,
        action: "POINTS_MANUAL_CREDIT",
        entityType: "PointTransaction",
        entityId: result.transaction.id,
        metadata: { points: input.points, reason: input.reason },
        requestId: input.requestId,
      },
    });
    return result;
  });
}

export async function reversePointTransaction(
  prisma: PrismaClient,
  session: MerchantSession,
  input: { transactionId: string; reason: string; idempotencyKey: string; requestId: string },
) {
  assertPermission(session.role, "points:reverse");
  return withSerializableRetry(prisma, async (tx) => {
    const original = await tx.pointTransaction.findFirst({
      where: { id: input.transactionId, merchantId: session.merchantId },
    });
    if (!original || original.type === "REVERSAL") throw new Error("TRANSACTION_NOT_FOUND");
    const alreadyReversed = await tx.pointTransaction.findFirst({
      where: { merchantId: session.merchantId, reversesTransactionId: original.id },
    });
    if (alreadyReversed) throw new Error("ALREADY_REVERSED");

    const result = await postPointTransaction(tx, {
      merchantId: session.merchantId,
      campaignId: original.campaignId,
      membershipId: original.membershipId,
      type: "REVERSAL",
      source: "MANUAL",
      pointsDelta: -original.pointsDelta,
      idempotencyKey: input.idempotencyKey,
      reasonCode: input.reason,
      actorMerchantUserId: session.userId,
      reversesTransactionId: original.id,
    });
    await tx.auditLog.create({
      data: {
        merchantId: session.merchantId,
        actorMerchantUserId: session.userId,
        action: "POINTS_REVERSED",
        entityType: "PointTransaction",
        entityId: result.transaction.id,
        metadata: { originalTransactionId: original.id, reason: input.reason },
        requestId: input.requestId,
      },
    });
    return result;
  });
}
