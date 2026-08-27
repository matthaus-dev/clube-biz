import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/security/origin";
import { revokeCurrentSession } from "@/modules/auth/infrastructure/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await revokeCurrentSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível sair." }, { status: 403 });
  }
}
