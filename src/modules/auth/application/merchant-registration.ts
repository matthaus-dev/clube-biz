import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { withSerializableRetry } from "@/lib/db/transaction";
import { hashPassword } from "@/modules/auth/infrastructure/password";
import { hashOpaqueToken } from "@/lib/security/hash";

export type RegisterMerchantInput = {
  publicName: string;
  rewardText: string;
  rewardGoal: number;
  ownerName: string;
  email: string;
  password: string;
  requestId: string;
};

function slugify(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54);
  return base || "loja";
}

async function createUniqueSlug(tx: Prisma.TransactionClient, publicName: string): Promise<string> {
  const base = slugify(publicName);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${randomUUID().slice(0, 6)}`;
    const existing = await tx.merchant.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  return `${base}-${randomUUID().slice(0, 10)}`;
}

export async function registerMerchant(prisma: PrismaClient, input: RegisterMerchantInput) {
  const emailNormalized = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  return withSerializableRetry(prisma, async (tx) => {
    const existingUser = await tx.merchantUser.findUnique({
      where: { emailNormalized },
      select: { id: true },
    });
    if (existingUser) throw new Error("EMAIL_ALREADY_EXISTS");

    const slug = await createUniqueSlug(tx, input.publicName);
    const merchant = await tx.merchant.create({
      data: {
        name: input.publicName,
        slug,
        status: "ACTIVE",
      },
    });
    const user = await tx.merchantUser.create({
      data: {
        merchantId: merchant.id,
        name: input.ownerName,
        emailNormalized,
        passwordHash,
        role: "OWNER",
        status: "ACTIVE",
      },
    });
    const campaign = await tx.campaign.create({
      data: {
        merchantId: merchant.id,
        name: input.publicName,
        status: "ACTIVE",
        pointsPerClaim: 1,
        rewardThreshold: input.rewardGoal,
        rewardTitle: input.rewardText,
      },
    });
    const reward = await tx.reward.create({
      data: {
        campaignId: campaign.id,
        name: input.rewardText,
        pointsCost: input.rewardGoal,
        status: "ACTIVE",
      },
    });
    const publicToken = `cb-${randomUUID()}-${randomUUID().slice(0, 8)}`;
    await tx.qrCode.create({
      data: {
        merchantId: merchant.id,
        campaignId: campaign.id,
        kind: "STATIC",
        tokenHash: hashOpaqueToken(publicToken),
        publicToken,
        points: campaign.pointsPerClaim,
        status: "ACTIVE",
      },
    });
    await tx.auditLog.create({
      data: {
        merchantId: merchant.id,
        actorMerchantUserId: user.id,
        action: "MERCHANT_REGISTERED",
        entityType: "Merchant",
        entityId: merchant.id,
        metadata: {
          campaignId: campaign.id,
          rewardId: reward.id,
          rewardGoal: input.rewardGoal,
        },
        requestId: input.requestId,
      },
    });

    return { merchant, user, campaign, reward, publicToken };
  });
}
