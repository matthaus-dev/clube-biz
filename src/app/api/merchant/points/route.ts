import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertSameOrigin } from "@/lib/security/origin";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { createManualCredit } from "@/modules/loyalty/application/manual-points";

const schema = z.object({
  phone: z.string().min(10).max(30), cpf: z.string().max(20).optional(),
  points: z.number().int().positive().max(10_000), reason: z.string().trim().min(3).max(120),
  idempotencyKey: z.uuid(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const input = schema.parse(await request.json());
    const result = await createManualCredit(prisma, session, { ...input, requestId });
    return NextResponse.json({ balance: result.membership.balance, pointsAdded: result.transaction.pointsDelta }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "FORBIDDEN" ? 403 : ["POINT_LIMIT_EXCEEDED", "INVALID_POINTS"].includes(code) || error instanceof z.ZodError ? 400 : 500;
    const message = code === "POINT_LIMIT_EXCEEDED" ? "Quantidade acima do limite do seu perfil." : status === 403 ? "Sem permissão." : status === 400 ? "Confira os dados informados." : "Não foi possível registrar os pontos.";
    return NextResponse.json({ error: message, requestId }, { status });
  }
}
