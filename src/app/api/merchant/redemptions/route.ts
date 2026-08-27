import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertSameOrigin } from "@/lib/security/origin";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { createRedemption } from "@/modules/rewards/application/redemptions";

const schema = z.object({ membershipId: z.string().min(10), rewardId: z.string().min(10), idempotencyKey: z.uuid() });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const input = schema.parse(await request.json());
    const redemption = await createRedemption(prisma, session, { ...input, requestId });
    return NextResponse.json({ redemptionId: redemption.id, pointsSpent: redemption.pointsSpent }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "FORBIDDEN" ? 403 : ["INSUFFICIENT_BALANCE", "REDEMPTION_NOT_FOUND"].includes(code) || error instanceof z.ZodError ? 400 : 500;
    const message = code === "INSUFFICIENT_BALANCE" ? "Saldo insuficiente." : status === 403 ? "Sem permissão." : "Não foi possível concluir o resgate.";
    return NextResponse.json({ error: message, requestId }, { status });
  }
}
