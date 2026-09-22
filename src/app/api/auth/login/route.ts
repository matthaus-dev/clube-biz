import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { assertSameOrigin } from "@/lib/security/origin";
import { verifyPassword } from "@/modules/auth/infrastructure/password";
import { createSession, setSessionCookie } from "@/modules/auth/infrastructure/session";

const schema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(6).max(128),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const body = schema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateKey = keyedHash(`login:${ip}:${body.email}`, getEnv().PII_HASH_PEPPER);
    const rate = checkLocalRateLimit(rateKey, 8, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Acesso temporariamente bloqueado.", requestId }, { status: 429 });
    }

    const user = await prisma.merchantUser.findUnique({
      where: { emailNormalized: body.email },
      include: { merchant: true },
    });
    const merchant = user?.merchant ?? null;
    const valid = Boolean(
      merchant?.status === "ACTIVE" && user?.status === "ACTIVE" && user.passwordHash &&
      await verifyPassword(user.passwordHash, body.password),
    );

    if (!valid || !merchant || !user) {
      if (merchant) await prisma.auditLog.create({
        data: {
          merchantId: merchant.id,
          action: "AUTH_LOGIN_FAILED",
          entityType: "Merchant",
          entityId: merchant.id,
          metadata: { result: "rejected" },
          requestId,
        },
      });
      return NextResponse.json({ error: "Credenciais inválidas.", requestId }, { status: 401 });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    await prisma.$transaction([
      prisma.merchantUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          merchantId: merchant.id,
          actorMerchantUserId: user.id,
          action: "AUTH_LOGIN_SUCCEEDED",
          entityType: "MerchantUser",
          entityId: user.id,
          metadata: { role: user.role },
          requestId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, redirectTo: "/painel" });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof Error && error.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: status === 400 ? "Confira os dados informados." : "Não foi possível entrar.", requestId }, { status });
  }
}
