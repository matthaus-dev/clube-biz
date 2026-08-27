import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { verifyBalanceChallenge } from "@/modules/loyalty/application/balance-challenge";

const schema = z.object({
  challengeId: z.uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = schema.parse(await request.json());
    const key = keyedHash(`balance-verify:${body.challengeId}`, getEnv().PII_HASH_PEPPER);
    const rate = checkLocalRateLimit(key, 6, 10 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Código inválido ou expirado.", requestId }, { status: 400 });
    }
    const result = await verifyBalanceChallenge(prisma, body);
    return NextResponse.json({ ...result, requestId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Código inválido ou expirado.", requestId }, { status: 400 });
    }
    return NextResponse.json({ error: "Código inválido ou expirado.", requestId }, { status: 400 });
  }
}
