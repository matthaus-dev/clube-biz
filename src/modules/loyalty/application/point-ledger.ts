import type {
  PointTransactionSource,
  PointTransactionType,
  Prisma,
} from "@prisma/client";

export type PostPointTransactionInput = {
  merchantId: string;
  campaignId: string;
  membershipId: string;
  type: PointTransactionType;
  source: PointTransactionSource;
  pointsDelta: number;
  idempotencyKey: string;
  reasonCode?: string;
  note?: string;
  qrCodeId?: string;
  redemptionId?: string;
  actorMerchantUserId?: string;
  requestFingerprint?: string;
  reversesTransactionId?: string;
  createdAt?: Date;
};

export async function postPointTransaction(tx: Prisma.TransactionClient, input: PostPointTransactionInput) {
  if (!Number.isSafeInteger(input.pointsDelta) || input.pointsDelta === 0) throw new Error("INVALID_POINTS");

  const existing = await tx.pointTransaction.findUnique({
    where: {
      merchantId_idempotencyKey: {
        merchantId: input.merchantId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (existing) {
    const membership = await tx.membership.findUniqueOrThrow({ where: { id: existing.membershipId } });
    return { transaction: existing, membership, duplicate: true };
  }

  const membership = await tx.membership.findFirst({
    where: { id: input.membershipId, campaignId: input.campaignId },
  });
  if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND");

  const debit = input.pointsDelta < 0 ? Math.abs(input.pointsDelta) : 0;
  if (debit > membership.balance) throw new Error("INSUFFICIENT_BALANCE");

  const transaction = await tx.pointTransaction.create({
    data: {
      merchantId: input.merchantId,
      campaignId: input.campaignId,
      membershipId: input.membershipId,
      type: input.type,
      source: input.source,
      pointsDelta: input.pointsDelta,
      idempotencyKey: input.idempotencyKey,
      reasonCode: input.reasonCode,
      note: input.note,
      qrCodeId: input.qrCodeId,
      redemptionId: input.redemptionId,
      actorMerchantUserId: input.actorMerchantUserId,
      requestFingerprint: input.requestFingerprint,
      reversesTransactionId: input.reversesTransactionId,
      createdAt: input.createdAt,
    },
  });

  const updated = await tx.membership.updateMany({
    where: {
      id: input.membershipId,
      campaignId: input.campaignId,
      ...(debit ? { balance: { gte: debit } } : {}),
    },
    data: {
      balance: { increment: input.pointsDelta },
      ...(input.type === "EARN" && input.pointsDelta > 0
        ? { lifetimeEarned: { increment: input.pointsDelta } }
        : {}),
      ...(input.type === "REDEEM" && input.pointsDelta < 0
        ? { lifetimeRedeemed: { increment: debit } }
        : {}),
    },
  });
  if (updated.count !== 1) throw new Error("INSUFFICIENT_BALANCE");

  return {
    transaction,
    membership: await tx.membership.findUniqueOrThrow({ where: { id: input.membershipId } }),
    duplicate: false,
  };
}
