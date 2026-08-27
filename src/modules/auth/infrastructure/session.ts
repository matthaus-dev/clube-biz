import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MerchantRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashOpaqueToken } from "@/lib/security/hash";

const COOKIE_NAME = "clube_biz_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type MerchantSession = {
  sessionId: string;
  userId: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  timezone: string;
  role: MerchantRole;
  email: string;
};

export async function createSession(merchantUserId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      merchantUserId,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

async function resolveSession(): Promise<MerchantSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { merchantUser: { include: { merchant: true } } },
  });
  if (
    !session || session.revokedAt || session.expiresAt <= new Date() ||
    session.merchantUser.status !== "ACTIVE" || session.merchantUser.merchant.status !== "ACTIVE"
  ) return null;

  return {
    sessionId: session.id,
    userId: session.merchantUser.id,
    merchantId: session.merchantUser.merchantId,
    merchantName: session.merchantUser.merchant.name,
    merchantSlug: session.merchantUser.merchant.slug,
    timezone: session.merchantUser.merchant.timezone,
    role: session.merchantUser.role,
    email: session.merchantUser.emailNormalized,
  };
}

export const getCurrentSession = cache(resolveSession);

export async function requireSession(): Promise<MerchantSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function revokeCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashOpaqueToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(COOKIE_NAME);
}
