import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { withSerializableRetry } from "@/lib/db/transaction";
import { hashOpaqueToken } from "@/lib/security/hash";
import { hashPassword } from "@/modules/auth/infrastructure/password";

const RESET_TTL_MS = 30 * 60 * 1000;

export type PasswordResetDelivery = {
  token: string;
  userId: string;
  merchantId: string;
  merchantName: string;
  ownerName: string;
  email: string;
};

export async function createPasswordResetRequest(
  prisma: PrismaClient,
  input: { email: string; requestId: string; now?: Date },
): Promise<PasswordResetDelivery | null> {
  const emailNormalized = input.email.trim().toLowerCase();
  const now = input.now ?? new Date();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);

  return withSerializableRetry(prisma, async (tx) => {
    const user = await tx.merchantUser.findUnique({
      where: { emailNormalized },
      include: { merchant: true },
    });
    if (!user || user.status !== "ACTIVE" || user.merchant.status !== "ACTIVE") return null;

    await tx.passwordResetToken.create({
      data: { merchantUserId: user.id, tokenHash, expiresAt },
    });
    await tx.auditLog.create({
      data: {
        merchantId: user.merchantId,
        action: "AUTH_PASSWORD_RESET_REQUESTED",
        entityType: "MerchantUser",
        entityId: user.id,
        metadata: { channel: "email", provider: "resend" },
        requestId: input.requestId,
      },
    });

    return {
      token,
      userId: user.id,
      merchantId: user.merchantId,
      merchantName: user.merchant.name,
      ownerName: user.name,
      email: user.emailNormalized,
    };
  });
}

export async function resetPasswordWithToken(
  prisma: PrismaClient,
  input: { token: string; password: string; requestId: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const tokenHash = hashOpaqueToken(input.token);
  const passwordHash = await hashPassword(input.password);

  return withSerializableRetry(prisma, async (tx) => {
    const resetToken = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { merchantUser: { include: { merchant: true } } },
    });
    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= now ||
      resetToken.merchantUser.status !== "ACTIVE" ||
      resetToken.merchantUser.merchant.status !== "ACTIVE"
    ) throw new Error("PASSWORD_RESET_INVALID");

    const tokenUpdate = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null },
      data: { usedAt: now },
    });
    if (tokenUpdate.count !== 1) throw new Error("PASSWORD_RESET_INVALID");

    const user = await tx.merchantUser.update({
      where: { id: resetToken.merchantUserId },
      data: { passwordHash },
    });
    await tx.session.updateMany({
      where: { merchantUserId: user.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.auditLog.create({
      data: {
        merchantId: user.merchantId,
        actorMerchantUserId: user.id,
        action: "AUTH_PASSWORD_RESET_SUCCEEDED",
        entityType: "MerchantUser",
        entityId: user.id,
        metadata: { revokedSessions: true },
        requestId: input.requestId,
      },
    });

    return user;
  });
}
