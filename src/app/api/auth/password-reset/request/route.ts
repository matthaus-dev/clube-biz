import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { assertSameOrigin } from "@/lib/security/origin";
import { createPasswordResetRequest } from "@/modules/auth/application/password-reset";
import { sendPasswordResetEmail } from "@/modules/auth/infrastructure/resend";

const schema = z.object({
  email: z.email().trim().toLowerCase().max(254),
});

const publicMessage = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const body = schema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateKey = keyedHash(`password-reset:${ip}:${body.email}`, getEnv().PII_HASH_PEPPER);
    const rate = checkLocalRateLimit(rateKey, 5, 60 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: true, message: publicMessage, requestId });
    }

    const delivery = await createPasswordResetRequest(prisma, { email: body.email, requestId });
    if (delivery) {
      const resetUrl = `${getEnv().APP_URL}/redefinir-senha?token=${encodeURIComponent(delivery.token)}`;
      try {
        await sendPasswordResetEmail({
          to: delivery.email,
          ownerName: delivery.ownerName,
          merchantName: delivery.merchantName,
          resetUrl,
        });
      } catch {
        await prisma.auditLog.create({
          data: {
            merchantId: delivery.merchantId,
            action: "AUTH_PASSWORD_RESET_EMAIL_FAILED",
            entityType: "MerchantUser",
            entityId: delivery.userId,
            metadata: { provider: "resend" },
            requestId,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, message: publicMessage, requestId });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof Error && error.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: status === 400 ? "Confira os dados informados." : "Não foi possível solicitar a recuperação.", requestId }, { status });
  }
}
