import { Prisma, type PrismaClient } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { hashOpaqueToken, keyedHash } from "@/lib/security/hash";
import { findCustomerByIdentity, findOrCreateCustomerWithState, protectIdentity } from "@/modules/customers/application/customer-identity";
import { maskPhone } from "@/modules/customers/domain/identity";
import { evaluateClaimPolicy, startOfDayInTimeZone } from "@/modules/loyalty/domain/claim-policy";
import { postPointTransaction } from "@/modules/loyalty/application/point-ledger";

export type ClaimStaticQrInput = {
  token: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  whatsappConsent?: boolean;
  idempotencyKey: string;
  ipAddress?: string;
  userAgent?: string;
  now?: Date;
};

export type ClaimStaticQrResult = {
  status: "credited" | "blocked" | "needs_registration";
  reason?: string;
  pointsAdded: number;
  balance: number;
  maskedIdentity: string;
  maskedPhone?: string;
  welcomeMessageId?: string;
};

function publicReason(reason: string): string {
  const messages: Record<string, string> = {
    COOLDOWN: "Esta compra ainda está dentro do intervalo entre registros.",
    DAILY_LIMIT: "O limite de registros de hoje foi atingido.",
    CAMPAIGN_NOT_STARTED: "A campanha ainda não começou.",
    CAMPAIGN_ENDED: "A campanha foi encerrada.",
  };
  return messages[reason] ?? "Não foi possível registrar esta compra.";
}

function maskIdentity(identity: ReturnType<typeof protectIdentity>): string {
  if (identity.phone) return maskPhone(identity.phone);
  return "Cliente";
}

async function attemptClaim(prisma: PrismaClient, input: ClaimStaticQrInput): Promise<ClaimStaticQrResult> {
  const now = input.now ?? new Date();
  const identity = protectIdentity(input.phone);
  const env = getEnv();

  return prisma.$transaction(async (tx) => {
    const qr = await tx.qrCode.findUnique({
      where: { tokenHash: hashOpaqueToken(input.token) },
      include: { merchant: true, campaign: true },
    });
    if (!qr || qr.kind !== "STATIC" || qr.status !== "ACTIVE") throw new Error("QR_UNAVAILABLE");
    if (qr.merchant.status !== "ACTIVE" || qr.campaign.status !== "ACTIVE") throw new Error("QR_UNAVAILABLE");

    const priorClaim = await tx.qrClaim.findUnique({
      where: { qrCodeId_idempotencyKey: { qrCodeId: qr.id, idempotencyKey: input.idempotencyKey } },
      include: { membership: true, customer: true, pointTransaction: true },
    });
    if (priorClaim?.membership) {
      return {
        status: priorClaim.status === "SUCCEEDED" ? "credited" : "blocked",
        reason: priorClaim.reasonCode ? publicReason(priorClaim.reasonCode) : undefined,
        pointsAdded: priorClaim.pointTransaction?.pointsDelta ?? 0,
        balance: priorClaim.membership.balance,
        maskedIdentity: maskIdentity(identity),
        maskedPhone: identity.phone ? maskPhone(identity.phone) : undefined,
      };
    }

    const existingCustomer = await findCustomerByIdentity(tx, identity);
    const existingMembership = existingCustomer
      ? await tx.membership.findUnique({
          where: { campaignId_customerId: { campaignId: qr.campaignId, customerId: existingCustomer.id } },
        })
      : null;

    if (!existingCustomer && !input.firstName?.trim()) {
      return {
        status: "needs_registration",
        reason: "Complete o cadastro para participar deste clube.",
        pointsAdded: 0,
        balance: 0,
        maskedIdentity: maskIdentity(identity),
        maskedPhone: identity.phone ? maskPhone(identity.phone) : undefined,
      };
    }
    if (!existingCustomer && input.whatsappConsent !== true) throw new Error("CONSENT_REQUIRED");

    const customerResult = await findOrCreateCustomerWithState(tx, identity, {
      firstName: input.firstName,
      lastName: input.lastName,
    });
    const customer = customerResult.customer;
    if (customer.status !== "ACTIVE") throw new Error("CUSTOMER_UNAVAILABLE");

    let welcomeMessageId: string | undefined;
    if (customerResult.created) {
      await tx.customerConsent.create({
        data: {
          customerId: customer.id,
          purpose: "WELCOME_WHATSAPP",
          source: "QR_REGISTRATION",
          grantedAt: now,
        },
      });
      const delivery = await tx.messageDelivery.create({
        data: { customerId: customer.id, kind: "WELCOME_WHATSAPP" },
      });
      welcomeMessageId = delivery.id;
    }

    const membership = existingMembership ?? await tx.membership.create({
      data: { campaignId: qr.campaignId, customerId: customer.id },
    });

    const lastClaim = await tx.qrClaim.findFirst({
      where: {
        customerId: customer.id,
        status: "SUCCEEDED",
        qrCode: { campaignId: qr.campaignId },
      },
      orderBy: { claimedAt: "desc" },
      select: { claimedAt: true },
    });
    const dayStart = startOfDayInTimeZone(now, qr.merchant.timezone);
    const successfulClaimsToday = await tx.qrClaim.count({
      where: {
        customerId: customer.id,
        status: "SUCCEEDED",
        claimedAt: { gte: dayStart },
        qrCode: { campaignId: qr.campaignId },
      },
    });
    const policy = evaluateClaimPolicy({
      now,
      campaignStartsAt: qr.campaign.startsAt,
      campaignEndsAt: qr.campaign.endsAt,
      lastSuccessfulClaimAt: lastClaim?.claimedAt ?? null,
      successfulClaimsToday,
      cooldownHours: qr.campaign.claimCooldownHours,
      dailyLimit: qr.campaign.dailyClaimLimit,
    });

    const fingerprint = input.ipAddress
      ? keyedHash(input.ipAddress, env.PII_HASH_PEPPER)
      : null;
    const userAgentHash = input.userAgent
      ? keyedHash(input.userAgent.slice(0, 500), env.PII_HASH_PEPPER)
      : null;

    if (!policy.allowed) {
      await tx.qrClaim.create({
        data: {
          qrCodeId: qr.id,
          customerId: customer.id,
          membershipId: membership.id,
          status: "REJECTED",
          reasonCode: policy.reason,
          idempotencyKey: input.idempotencyKey,
          ipHash: fingerprint,
          userAgentHash,
          claimedAt: now,
        },
      });
      return {
        status: "blocked",
        reason: publicReason(policy.reason),
        pointsAdded: 0,
        balance: membership.balance,
        maskedIdentity: maskIdentity(identity),
        maskedPhone: identity.phone ? maskPhone(identity.phone) : undefined,
        welcomeMessageId,
      };
    }

    const ledger = await postPointTransaction(tx, {
      merchantId: qr.merchantId,
      campaignId: qr.campaignId,
      membershipId: membership.id,
      type: "EARN",
      pointsDelta: qr.campaign.pointsPerClaim,
      source: "STATIC_QR",
      idempotencyKey: input.idempotencyKey,
      qrCodeId: qr.id,
      requestFingerprint: fingerprint ?? undefined,
      createdAt: now,
    });
    await tx.qrClaim.create({
      data: {
        qrCodeId: qr.id,
        customerId: customer.id,
        membershipId: membership.id,
        pointTransactionId: ledger.transaction.id,
        status: "SUCCEEDED",
        idempotencyKey: input.idempotencyKey,
        ipHash: fingerprint,
        userAgentHash,
        claimedAt: now,
      },
    });

    return {
      status: "credited",
      pointsAdded: qr.campaign.pointsPerClaim,
      balance: ledger.membership.balance,
      maskedIdentity: maskIdentity(identity),
      maskedPhone: identity.phone ? maskPhone(identity.phone) : undefined,
      welcomeMessageId,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function claimStaticQr(prisma: PrismaClient, input: ClaimStaticQrInput): Promise<ClaimStaticQrResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await attemptClaim(prisma, input);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code) &&
        attempt < 2
      ) continue;
      throw error;
    }
  }
  throw new Error("CLAIM_RETRY_EXHAUSTED");
}
