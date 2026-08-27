import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertSameOrigin } from "@/lib/security/origin";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { reversePointTransaction } from "@/modules/loyalty/application/manual-points";

const schema = z.object({ transactionId: z.string().min(10), reason: z.string().trim().min(3).max(120), idempotencyKey: z.uuid() });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const input = schema.parse(await request.json());
    const result = await reversePointTransaction(prisma, session, { ...input, requestId });
    return NextResponse.json({ balance: result.membership.balance });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "FORBIDDEN" ? 403 : ["TRANSACTION_NOT_FOUND", "ALREADY_REVERSED", "INSUFFICIENT_BALANCE"].includes(code) || error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: status === 403 ? "Sem permissão." : "Não foi possível estornar esta movimentação.", requestId }, { status });
  }
}
