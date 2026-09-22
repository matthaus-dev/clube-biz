import { randomInt, randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { keyedHash, safeHashEqual } from "@/lib/security/hash";
import { protectIdentity } from "@/modules/customers/application/customer-identity";
import { deliverOtp } from "@/modules/loyalty/infrastructure/otp-delivery";
import { withSerializableRetry } from "@/lib/db/transaction";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type StartBalanceChallengeInput = {
  merchantSlug?: string;
  phone: string;
  now?: Date;
};

export async function startBalanceChallenge(prisma: PrismaClient, input: StartBalanceChallengeInput) {
  const now = input.now ?? new Date();
  const identity = protectIdentity(input.phone);
  if (!identity.phoneHash) throw new Error("PHONE_REQUIRED");
  const matches = await prisma.customer.findMany({
    where: {
      phoneHash: identity.phoneHash,
    },
    take: 2,
  });
  const customer = matches.length === 1 ? matches[0] : null;
  if (!customer || customer.status !== "ACTIVE" || customer.phoneHash !== identity.phoneHash) throw new Error("CUSTOMER_UNAVAILABLE");
  const firstMembership = await prisma.membership.findFirst({
    where: { customerId: customer.id, campaign: { merchant: { status: "ACTIVE" }, status: "ACTIVE" } },
    select: { campaignId: true }, orderBy: { createdAt: "asc" },
  });
  if (!firstMembership) throw new Error("CAMPAIGN_UNAVAILABLE");
  const challengeId = randomUUID();
  const code = randomInt(100000, 1000000).toString();
  const env = getEnv();

  await prisma.identityChallenge.create({
    data: {
      id: challengeId,
      campaignId: firstMembership.campaignId,
      customerId: customer.id,
      channel: env.OTP_DELIVERY_MODE === "evolution" ? "WHATSAPP" : "SMS",
      destinationHash: identity.phoneHash,
      codeHash: keyedHash(`${challengeId}:${code}`, env.PII_HASH_PEPPER),
      purpose: "BALANCE_LOOKUP",
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    },
  });

  try {
    await deliverOtp(identity.phone!, code);
  } catch {
    await prisma.identityChallenge.update({ where: { id: challengeId }, data: { status: "BLOCKED" } });
    throw new Error("OTP_DELIVERY_UNAVAILABLE");
  }

  return {
    challengeId,
    expiresInSeconds: CHALLENGE_TTL_MS / 1000,
    devCode: process.env.NODE_ENV !== "production" && env.OTP_DELIVERY_MODE === "console" ? code : undefined,
  };
}

export async function verifyBalanceChallenge(
  prisma: PrismaClient,
  input: { challengeId: string; code: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const env = getEnv();

  const result = await withSerializableRetry(prisma, async (tx) => {
    const challenge = await tx.identityChallenge.findUnique({ where: { id: input.challengeId } });
    if (!challenge || challenge.purpose !== "BALANCE_LOOKUP") throw new Error("INVALID_CHALLENGE");
    if (challenge.status !== "PENDING") throw new Error("INVALID_CHALLENGE");
    if (challenge.expiresAt <= now) {
      await tx.identityChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
      return null;
    }

    const suppliedHash = keyedHash(`${challenge.id}:${input.code}`, env.PII_HASH_PEPPER);
    if (!safeHashEqual(suppliedHash, challenge.codeHash)) {
      const attempts = challenge.attempts + 1;
      await tx.identityChallenge.update({
        where: { id: challenge.id },
        data: { attempts, status: attempts >= MAX_ATTEMPTS ? "BLOCKED" : "PENDING" },
      });
      return null;
    }

    await tx.identityChallenge.update({
      where: { id: challenge.id },
      data: { status: "VERIFIED", verifiedAt: now },
    });

    if (!challenge.customerId) return { balance: 0, history: [] };
    const memberships = await tx.membership.findMany({
      where: { customerId: challenge.customerId, campaign: { merchant: { status: "ACTIVE" }, status: "ACTIVE" } },
      orderBy: { createdAt: "asc" },
      select: { balance: true, campaign: { select: { name: true, rewardTitle: true, rewardThreshold: true, merchant: { select: { name: true } } } }, transactions: { where: { status: "POSTED" }, orderBy: { createdAt: "desc" }, take: 5, select: { type: true, pointsDelta: true, createdAt: true } } },
    });
    const first = memberships[0];
    return {
      balance: first?.balance ?? 0,
      history: first?.transactions ?? [],
      cards: memberships.map((item) => ({ merchantName: item.campaign.merchant.name, campaignName: item.campaign.name, rewardTitle: item.campaign.rewardTitle, balance: item.balance, rewardThreshold: item.campaign.rewardThreshold, history: item.transactions })),
    };
  });
  if (!result) throw new Error("INVALID_CHALLENGE");
  return result;
}
