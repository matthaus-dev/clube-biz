import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertSameOrigin } from "@/lib/security/origin";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { cancelRedemption } from "@/modules/rewards/application/redemptions";

const schema = z.object({ reason: z.string().trim().min(3).max(120), idempotencyKey: z.uuid() });

export async function POST(request: Request, context: RouteContext<"/api/merchant/redemptions/[id]/cancel">) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const input = schema.parse(await request.json());
    const { id } = await context.params;
    await cancelRedemption(prisma, session, { redemptionId: id, ...input, requestId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "FORBIDDEN" ? 403 : ["REDEMPTION_NOT_FOUND", "REDEMPTION_LEDGER_MISSING"].includes(code) || error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: status === 403 ? "Sem permissão." : "Não foi possível cancelar o resgate.", requestId }, { status });
  }
}
