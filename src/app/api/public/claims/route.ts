import { after, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { getEnv } from "@/lib/env";
import { InvalidIdentityError } from "@/modules/customers/domain/identity";
import { claimStaticQr } from "@/modules/qr-codes/application/claim-static-qr";
import { dispatchWelcomeMessage } from "@/modules/loyalty/application/welcome-message";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

const schema = z.object({
  token: z.string().min(16).max(256),
  phone: z.string().trim().min(10).max(30),
  firstName: optionalText(60),
  lastName: optionalText(80),
  whatsappConsent: z.boolean().optional(),
  idempotencyKey: z.uuid(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = schema.parse(await request.json());
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ipAddress = forwarded ?? "unknown";
    const rateKey = keyedHash(`claim:${ipAddress}`, getEnv().PII_HASH_PEPPER);
    const rate = checkLocalRateLimit(rateKey, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde um momento.", requestId },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const result = await claimStaticQr(prisma, {
      ...body,
      ipAddress,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const { welcomeMessageId, ...publicResult } = result;
    if (welcomeMessageId) {
      after(async () => {
        try {
          await dispatchWelcomeMessage(prisma, welcomeMessageId);
        } catch {
          // The claim already committed; delivery errors must not affect its response.
        }
      });
    }
    return NextResponse.json({ ...publicResult, requestId }, { status: result.status === "credited" ? 201 : 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Confira os dados informados.", requestId }, { status: 400 });
    }
    const invalidIdentity = error instanceof InvalidIdentityError || error instanceof Error && ["IDENTITY_REQUIRED", "IDENTITY_CONFLICT", "CONSENT_REQUIRED"].includes(error.message);
    if (invalidIdentity) {
      return NextResponse.json({ error: "Confira o celular e o consentimento informados.", requestId }, { status: 400 });
    }
    const known = error instanceof Error && ["QR_UNAVAILABLE", "CUSTOMER_UNAVAILABLE"].includes(error.message);
    return NextResponse.json(
      { error: known ? "Este código não está disponível." : "Não foi possível registrar agora.", requestId },
      { status: known ? 404 : 500 },
    );
  }
}
