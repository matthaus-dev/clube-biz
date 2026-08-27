import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { keyedHash } from "@/lib/security/hash";
import { decryptPii } from "@/lib/security/pii";
import { maskCpf, maskPhone, normalizeCpf, normalizePhone } from "@/modules/customers/domain/identity";
import { startOfDayInTimeZone } from "@/modules/loyalty/domain/claim-policy";

export async function getMerchantCampaign(merchantId: string) {
  return prisma.campaign.findFirst({
    where: { merchantId, status: { in: ["ACTIVE", "PAUSED"] } },
    include: { rewards: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDashboardMetrics(merchantId: string, days: number) {
  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId }, select: { timezone: true } });
  const localToday = startOfDayInTimeZone(new Date(), merchant.timezone);
  const since = new Date(localToday.getTime() - (safeDays - 1) * 24 * 60 * 60 * 1000);
  const [rows, recent, campaign, qrCode] = await Promise.all([
    prisma.$queryRaw<Array<{
      activeCustomers: bigint;
      credits: bigint;
      redemptions: bigint;
      pointsIssued: bigint;
    }>>(Prisma.sql`
      SELECT
        COUNT(DISTINCT CASE WHEN pt."pointsDelta" > 0 THEN pt."membershipId" END)::bigint AS "activeCustomers",
        COUNT(CASE WHEN pt."type" = 'EARN' THEN 1 END)::bigint AS credits,
        COUNT(CASE WHEN pt."type" = 'REDEEM' THEN 1 END)::bigint AS redemptions,
        COALESCE(SUM(CASE WHEN pt."pointsDelta" > 0 AND pt."type" = 'EARN' THEN pt."pointsDelta" ELSE 0 END), 0)::bigint AS "pointsIssued"
      FROM "PointTransaction" pt
      WHERE pt."merchantId" = ${merchantId} AND pt."createdAt" >= ${since}
    `),
    prisma.pointTransaction.findMany({
      where: { merchantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, type: true, source: true, pointsDelta: true, createdAt: true, reasonCode: true,
        actorMerchantUser: { select: { emailNormalized: true } },
      },
    }),
    getMerchantCampaign(merchantId),
    prisma.qrCode.findFirst({
      where: { merchantId, kind: "STATIC", status: "ACTIVE", publicToken: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { publicToken: true, campaign: { select: { name: true } } },
    }),
  ]);
  const row = rows[0];
  return {
    days: safeDays,
    campaign,
    qrCode,
    metrics: {
      activeCustomers: Number(row?.activeCustomers ?? 0),
      credits: Number(row?.credits ?? 0),
      redemptions: Number(row?.redemptions ?? 0),
      pointsIssued: Number(row?.pointsIssued ?? 0),
    },
    recent,
  };
}

function maskedCustomer(customer: {
  firstName?: string | null;
  lastName?: string | null;
  emailNormalized?: string | null;
  phoneEncrypted: string | null;
  cpfEncrypted: string | null;
}) {
  const key = getEnv().PII_ENCRYPTION_KEY;
  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  const phoneMasked = customer.phoneEncrypted ? maskPhone(decryptPii(customer.phoneEncrypted, key)) : "Nao informado";
  return {
    displayName: displayName || "Cliente sem nome",
    email: customer.emailNormalized,
    phoneMasked,
    cpfMasked: customer.cpfEncrypted ? maskCpf(decryptPii(customer.cpfEncrypted, key)) : null,
  };
}

function searchIdentityHash(search?: string) {
  if (!search?.trim()) return null;
  const pepper = getEnv().PII_HASH_PEPPER;
  const alternatives: Array<{ phoneHash: string } | { cpfHash: string }> = [];
  try { alternatives.push({ phoneHash: keyedHash(normalizePhone(search), pepper) }); } catch {}
  try { alternatives.push({ cpfHash: keyedHash(normalizeCpf(search), pepper) }); } catch {}
  return alternatives.length ? { OR: alternatives } : { id: "invalid-search" };
}

export async function listMerchantCustomers(
  merchantId: string,
  input: { cursor?: string; search?: string; take?: number } = {},
) {
  const take = Math.min(Math.max(input.take ?? 25, 1), 50);
  const identityWhere = searchIdentityHash(input.search);
  const rows = await prisma.membership.findMany({
    where: {
      campaign: { merchantId },
      ...(identityWhere ? { customer: identityWhere } : {}),
    },
    orderBy: { id: "asc" },
    take: take + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: { customer: true, campaign: { select: { name: true } } },
  });
  const hasNext = rows.length > take;
  const page = hasNext ? rows.slice(0, take) : rows;
  return {
    customers: page.map((membership) => ({
      id: membership.id,
      balance: membership.balance,
      lifetimeEarned: membership.lifetimeEarned,
      lifetimeRedeemed: membership.lifetimeRedeemed,
      campaignName: membership.campaign.name,
      createdAt: membership.createdAt,
      ...maskedCustomer(membership.customer),
    })),
    nextCursor: hasNext ? page.at(-1)?.id : undefined,
  };
}

export async function getMerchantCustomer(merchantId: string, membershipId: string) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, campaign: { merchantId } },
    include: {
      customer: true,
      campaign: { select: { name: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actorMerchantUser: { select: { emailNormalized: true } } },
      },
    },
  });
  if (!membership) return null;
  return { ...membership, ...maskedCustomer(membership.customer) };
}

export async function listMerchantTransactions(
  merchantId: string,
  filters: { type?: string; source?: string; from?: Date; to?: Date },
) {
  const allowedTypes = ["EARN", "REDEEM", "ADJUSTMENT", "REVERSAL", "EXPIRATION"] as const;
  const allowedSources = ["STATIC_QR", "DYNAMIC_QR", "DELIVERY_QR", "MANUAL", "SYSTEM"] as const;
  return prisma.pointTransaction.findMany({
    where: {
      merchantId,
      ...(allowedTypes.includes(filters.type as typeof allowedTypes[number])
        ? { type: filters.type as typeof allowedTypes[number] }
        : {}),
      ...(allowedSources.includes(filters.source as typeof allowedSources[number])
        ? { source: filters.source as typeof allowedSources[number] }
        : {}),
      ...((filters.from || filters.to) ? {
        createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) },
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      membership: { include: { customer: true } },
      actorMerchantUser: { select: { emailNormalized: true } },
    },
  }).then((rows) => rows.map((row) => ({
    ...row,
    ...maskedCustomer(row.membership.customer),
  })));
}
