import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerMerchant } from "@/modules/auth/application/merchant-registration";
import { createPasswordResetRequest, resetPasswordWithToken } from "@/modules/auth/application/password-reset";
import { verifyPassword } from "@/modules/auth/infrastructure/password";
import { createSession } from "@/modules/auth/infrastructure/session";

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const email = `cadastro-${suffix}@test.local`;
const initialPassword = "CadastroTeste123!";
const nextPassword = "NovaSenhaTeste123!";
let merchantId: string;
let userId: string;
let campaignId: string;

beforeAll(async () => {
  const result = await registerMerchant(prisma, {
    publicName: `Loja Cadastro ${suffix}`,
    rewardText: "Cafe gratis",
    rewardGoal: 12,
    ownerName: "Lojista Teste",
    email,
    password: initialPassword,
    requestId: randomUUID(),
  });
  merchantId = result.merchant.id;
  userId = result.user.id;
  campaignId = result.campaign.id;
});

afterAll(async () => {
  await prisma.passwordResetToken.deleteMany({ where: { merchantUser: { merchantId } } });
  await prisma.session.deleteMany({ where: { merchantUser: { merchantId } } });
  await prisma.auditLog.deleteMany({ where: { merchantId } });
  await prisma.qrCode.deleteMany({ where: { campaignId } });
  await prisma.reward.deleteMany({ where: { campaignId } });
  await prisma.campaign.deleteMany({ where: { id: campaignId } });
  await prisma.merchantUser.deleteMany({ where: { merchantId } });
  await prisma.merchant.deleteMany({ where: { id: merchantId } });
  await prisma.$disconnect();
});

describe("merchant onboarding auth", () => {
  it("creates an active merchant, owner, campaign and reward", async () => {
    const user = await prisma.merchantUser.findUniqueOrThrow({ where: { emailNormalized: email } });
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    const reward = await prisma.reward.findFirstOrThrow({ where: { campaignId } });

    expect(user.merchantId).toBe(merchantId);
    expect(user.name).toBe("Lojista Teste");
    expect(user.role).toBe("OWNER");
    expect(user.status).toBe("ACTIVE");
    expect(campaign.status).toBe("ACTIVE");
    expect(campaign.name).toContain("Loja Cadastro");
    expect(campaign.rewardTitle).toBe("Cafe gratis");
    expect(campaign.rewardThreshold).toBe(12);
    expect(reward.name).toBe("Cafe gratis");
    expect(reward.pointsCost).toBe(12);
  });

  it("resets the password with an opaque token and revokes sessions", async () => {
    const sessionToken = await createSession(userId);
    expect(sessionToken).toHaveLength(43);

    const delivery = await createPasswordResetRequest(prisma, { email, requestId: randomUUID() });
    expect(delivery?.email).toBe(email);
    expect(delivery?.token).toHaveLength(43);

    await resetPasswordWithToken(prisma, {
      token: delivery!.token,
      password: nextPassword,
      requestId: randomUUID(),
    });

    const user = await prisma.merchantUser.findUniqueOrThrow({ where: { id: userId } });
    const tokenRecord = await prisma.passwordResetToken.findFirstOrThrow({ where: { merchantUserId: userId } });
    const sessions = await prisma.session.findMany({ where: { merchantUserId: userId } });

    expect(await verifyPassword(user.passwordHash!, nextPassword)).toBe(true);
    expect(await verifyPassword(user.passwordHash!, initialPassword)).toBe(false);
    expect(tokenRecord.tokenHash).not.toBe(delivery!.token);
    expect(tokenRecord.usedAt).toBeInstanceOf(Date);
    expect(sessions.every((session) => session.revokedAt instanceof Date)).toBe(true);
  });
});
