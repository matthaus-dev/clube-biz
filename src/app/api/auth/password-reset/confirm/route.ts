import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { assertSameOrigin } from "@/lib/security/origin";
import { resetPasswordWithToken } from "@/modules/auth/application/password-reset";

const schema = z.object({
  token: z.string().trim().min(32).max(200),
  password: z.string().min(6).max(128),
  passwordConfirm: z.string().min(6).max(128),
}).refine((data) => data.password === data.passwordConfirm, {
  path: ["passwordConfirm"],
  error: "As senhas precisam ser iguais.",
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const body = schema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateKey = keyedHash(`password-reset-confirm:${ip}:${body.token.slice(0, 16)}`, getEnv().PII_HASH_PEPPER);
    const rate = checkLocalRateLimit(rateKey, 8, 60 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Acesso temporariamente bloqueado.", requestId }, { status: 429 });
    }

    await resetPasswordWithToken(prisma, { token: body.token, password: body.password, requestId });
    return NextResponse.json({ ok: true, redirectTo: "/login" });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof Error && error.message === "INVALID_ORIGIN" ? 403 : 400;
    return NextResponse.json({ error: status === 400 ? "Link inválido ou expirado." : "Não foi possível redefinir a senha.", requestId }, { status });
  }
}
