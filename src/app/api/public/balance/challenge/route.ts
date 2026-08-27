import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { startBalanceChallenge } from "@/modules/loyalty/application/balance-challenge";

const schema = z.object({
  phone: z.string().min(10).max(30).optional(),
  cpf: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = schema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = keyedHash(`balance-start:${ip}`, getEnv().PII_HASH_PEPPER);
    const rate = checkLocalRateLimit(key, 10, 10 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde antes de tentar novamente.", requestId },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }
    const challenge = await startBalanceChallenge(prisma, body);
    return NextResponse.json({
      message: "Se os dados estiverem corretos, você receberá um código de verificação.",
      ...challenge,
      requestId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Confira os dados informados.", requestId }, { status: 400 });
    }
    const status = error instanceof Error && ["CAMPAIGN_UNAVAILABLE", "CUSTOMER_UNAVAILABLE"].includes(error.message) ? 404 : 500;
    return NextResponse.json({ error: "Não foi possível iniciar a consulta.", requestId }, { status });
  }
}
