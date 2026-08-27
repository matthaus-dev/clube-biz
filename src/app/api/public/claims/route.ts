import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkLocalRateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/security/hash";
import { getEnv } from "@/lib/env";
import { InvalidIdentityError } from "@/modules/customers/domain/identity";
import { claimStaticQr } from "@/modules/qr-codes/application/claim-static-qr";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

const schema = z.object({
  token: z.string().min(16).max(256),
  phone: optionalText(30),
  cpf: optionalText(20),
  firstName: optionalText(60),
  lastName: optionalText(80),
  email: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.email().trim().toLowerCase().max(254).optional(),
  ),
  idempotencyKey: z.uuid(),
}).refine((data) => data.phone || data.cpf, {
  path: ["phone"],
  error: "Informe celular ou CPF.",
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
    return NextResponse.json({ ...result, requestId }, { status: result.status === "credited" ? 201 : 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Confira os dados informados.", requestId }, { status: 400 });
    }
    const invalidIdentity = error instanceof InvalidIdentityError || error instanceof Error && ["IDENTITY_REQUIRED", "IDENTITY_CONFLICT"].includes(error.message);
    if (invalidIdentity) {
      return NextResponse.json({ error: "Confira celular e CPF informados.", requestId }, { status: 400 });
    }
    const known = error instanceof Error && ["QR_UNAVAILABLE", "CUSTOMER_UNAVAILABLE"].includes(error.message);
    return NextResponse.json(
      { error: known ? "Este código não está disponível." : "Não foi possível registrar agora.", requestId },
      { status: known ? 404 : 500 },
    );
  }
}
