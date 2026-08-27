import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { assertSameOrigin } from "@/lib/security/origin";
import { registerMerchant } from "@/modules/auth/application/merchant-registration";
import { createSession, setSessionCookie } from "@/modules/auth/infrastructure/session";

const schema = z.object({
  publicName: z.string().trim().min(2).max(80),
  rewardText: z.string().trim().min(2).max(80),
  rewardGoal: z.coerce.number().int().refine((value) => value >= 2 && value <= 12 && value % 2 === 0, "A meta deve ser um multiplo de 2 entre 2 e 12."),
  ownerName: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(12).max(128),
  passwordConfirm: z.string().min(12).max(128),
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
    const rateKey = keyedHash(`register:${ip}:${body.email}`, getEnv().PII_HASH_PEPPER);
    const rate = checkLocalRateLimit(rateKey, 5, 60 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Cadastro temporariamente bloqueado.", requestId }, { status: 429 });
    }

    const result = await registerMerchant(prisma, { ...body, requestId });
    const token = await createSession(result.user.id);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, redirectTo: "/painel" });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS" ? 409 : error instanceof Error && error.message === "INVALID_ORIGIN" ? 403 : 500;
    const message = status === 409 ? "Este e-mail já está em uso." : status === 400 ? "Confira os dados informados." : "Não foi possível concluir o cadastro.";
    return NextResponse.json({ error: message, requestId }, { status });
  }
}
