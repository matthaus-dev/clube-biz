import { randomInt, randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { keyedHash, safeHashEqual } from "@/lib/security/hash";
import { protectIdentity } from "@/modules/customers/application/customer-identity";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type StartBalanceChallengeInput = {
  merchantSlug?: string;
  phone?: string;
  cpf?: string;
  now?: Date;
};

export async function startBalanceChallenge(prisma: PrismaClient, input: StartBalanceChallengeInput) {
  const now = input.now ?? new Date();
  const identity = protectIdentity(input.phone, input.cpf);
  if (!identity.phoneHash) throw new Error("PHONE_REQUIRED");
  const matches = await prisma.customer.findMany({
    where: {
      OR: [
        { phoneHash: identity.phoneHash },
        ...(identity.cpfHash ? [{ cpfHash: identity.cpfHash }] : []),
      ],
    },
    take: 2,
  });
  const customer = matches.length === 1 ? matches[0] : null;
  if (!customer) throw new Error("CUSTOMER_UNAVAILABLE");
  const firstMembership = await prisma.membership.findFirst({
    where: { customerId: customer.id, campaign: { merchant: { status: "ACTIVE" }, status: "ACTIVE" } },
    select: { campaignId: true }, orderBy: { createdAt: "asc" },
  });
  if (!firstMembership) throw new Error("CAMPAIGN_UNAVAILABLE");
  if (!identity.phoneHash) {
    const cards = await prisma.membership.findMany({ where: { customerId: customer.id, campaign: { merchant: { status: "ACTIVE" }, status: "ACTIVE" } }, select: { balance: true, campaign: { select: { name: true, rewardTitle: true, rewardThreshold: true, merchant: { select: { name: true } } } } } });
    return { challengeId: "", cards: cards.map((item) => ({ merchantName: item.campaign.merchant.name, campaignName: item.campaign.name, rewardTitle: item.campaign.rewardTitle, balance: item.balance, rewardThreshold: item.campaign.rewardThreshold, history: [] })) };
  }
  const challengeId = randomUUID();
  const code = randomInt(100000, 1000000).toString();
  const env = getEnv();

  await prisma.identityChallenge.create({
    data: {
      id: challengeId,
      campaignId: firstMembership.campaignId,
      customerId: customer.id,
      channel: "SMS",
      destinationHash: identity.phoneHash,
      codeHash: keyedHash(`${challengeId}:${code}`, env.PII_HASH_PEPPER),
      purpose: "BALANCE_LOOKUP",
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    },
  });

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

  return prisma.$transaction(async (tx) => {
    const challenge = await tx.identityChallenge.findUnique({ where: { id: input.challengeId } });
    if (!challenge || challenge.purpose !== "BALANCE_LOOKUP") throw new Error("INVALID_CHALLENGE");
    if (challenge.status !== "PENDING") throw new Error("INVALID_CHALLENGE");
    if (challenge.expiresAt <= now) {
      await tx.identityChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
      throw new Error("INVALID_CHALLENGE");
    }

    const suppliedHash = keyedHash(`${challenge.id}:${input.code}`, env.PII_HASH_PEPPER);
    if (!safeHashEqual(suppliedHash, challenge.codeHash)) {
      const attempts = challenge.attempts + 1;
      await tx.identityChallenge.update({
        where: { id: challenge.id },
        data: { attempts, status: attempts >= MAX_ATTEMPTS ? "BLOCKED" : "PENDING" },
      });
      throw new Error("INVALID_CHALLENGE");
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
}
