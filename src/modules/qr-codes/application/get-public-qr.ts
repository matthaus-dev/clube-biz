import { prisma } from "@/lib/db/prisma";
import { hashOpaqueToken } from "@/lib/security/hash";

export async function getPublicQr(token: string) {
  if (token.length < 16 || token.length > 256) return null;
  const now = new Date();
  const qr = await prisma.qrCode.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: {
      id: true,
      kind: true,
      status: true,
      validFrom: true,
      expiresAt: true,
      merchant: { select: { name: true, status: true } },
      campaign: {
        select: {
          name: true,
          status: true,
          startsAt: true,
          endsAt: true,
          rewardTitle: true,
          rewardThreshold: true,
        },
      },
    },
  });

  if (
    !qr ||
    qr.kind !== "STATIC" ||
    qr.status !== "ACTIVE" ||
    qr.merchant.status !== "ACTIVE" ||
    qr.campaign.status !== "ACTIVE" ||
    (qr.validFrom && qr.validFrom > now) ||
    (qr.expiresAt && qr.expiresAt < now) ||
    (qr.campaign.startsAt && qr.campaign.startsAt > now) ||
    (qr.campaign.endsAt && qr.campaign.endsAt < now)
  ) return null;

  return qr;
}
