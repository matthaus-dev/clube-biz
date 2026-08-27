import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertSameOrigin } from "@/lib/security/origin";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { updateCampaignSettings } from "@/modules/merchants/application/campaign-settings";

const schema = z.object({
  campaignId: z.string().min(10), name: z.string().trim().min(2).max(100), status: z.enum(["ACTIVE", "PAUSED"]),
  pointsPerClaim: z.number().int().min(1).max(100), rewardTitle: z.string().trim().min(2).max(120),
  rewardThreshold: z.number().int().refine((value) => value >= 2 && value <= 12 && value % 2 === 0, "A meta deve ser um multiplo de 2 entre 2 e 12."), claimCooldownHours: z.number().int().min(0).max(720),
  dailyClaimLimit: z.number().int().min(1).max(100), rewardId: z.string().min(10).optional(),
  rewardName: z.string().trim().min(2).max(100), rewardPointsCost: z.number().int().min(1).max(10_000),
});

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const input = schema.parse(await request.json());
    await updateCampaignSettings(prisma, session, { ...input, requestId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "FORBIDDEN" ? 403 : code === "CAMPAIGN_NOT_FOUND" || error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: status === 403 ? "Sem permissão." : status === 400 ? "Confira as configurações." : "Não foi possível salvar.", requestId }, { status });
  }
}
