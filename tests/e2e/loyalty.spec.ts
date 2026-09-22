import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { hashOpaqueToken } from "../../src/lib/security/hash";

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const merchantSlug = `e2e-${suffix}`;
const token = `e2e-static-qr-${randomUUID()}`;
const phone = `119${parseInt(randomUUID().slice(0, 8), 16).toString().padStart(8, "0").slice(-8)}`;
let merchantId: string;
let campaignId: string;

test.beforeAll(async () => {
  const merchant = await prisma.merchant.create({
    data: { name: "Pizzaria E2E", slug: merchantSlug },
  });
  merchantId = merchant.id;
  const campaign = await prisma.campaign.create({
    data: {
      merchantId,
      name: "Clube E2E",
      status: "ACTIVE",
      pointsPerClaim: 1,
      rewardThreshold: 10,
      rewardTitle: "Uma pizza grátis",
    },
  });
  campaignId = campaign.id;
  await prisma.qrCode.create({
    data: {
      merchantId,
      campaignId,
      kind: "STATIC",
      tokenHash: hashOpaqueToken(token),
      points: 1,
    },
  });
});

test.afterAll(async () => {
  const memberships = await prisma.membership.findMany({ where: { campaignId }, select: { customerId: true } });
  const customerIds = memberships.map((membership) => membership.customerId);
  await prisma.identityChallenge.deleteMany({ where: { campaignId } });
  await prisma.messageDelivery.deleteMany({ where: { customerId: { in: customerIds } } });
  await prisma.customerConsent.deleteMany({ where: { customerId: { in: customerIds } } });
  await prisma.qrClaim.deleteMany({ where: { qrCode: { campaignId } } });
  await prisma.pointTransaction.deleteMany({ where: { campaignId } });
  await prisma.membership.deleteMany({ where: { campaignId } });
  await prisma.qrCode.deleteMany({ where: { campaignId } });
  await prisma.campaign.delete({ where: { id: campaignId } });
  await prisma.merchant.delete({ where: { id: merchantId } });
  if (customerIds.length) await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.$disconnect();
});

test("credits a QR claim and returns the balance after OTP verification", async ({ page }) => {
  await page.goto(`/r/${token}`);
  await expect(page.getByRole("heading", { name: "Sua compra vale pontos." })).toBeVisible();
  await expect(page.getByText("Pizzaria E2E")).toBeVisible();

  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Complete o cadastro para participar deste clube.")).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Cliente QR");
  await page.getByLabel(/Aceito receber pelo WhatsApp/).check();
  await page.getByRole("button", { name: "Criar cadastro e registrar ponto" }).click();
  await expect(page.getByText("Compra registrada!")).toBeVisible();
  await expect(page.getByText("1 ponto(s)", { exact: true })).toBeVisible();

  await page.goto("/saldo");
  await page.getByLabel("Estabelecimento").fill(merchantSlug);
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByRole("button", { name: "Enviar código" }).click();
  const localMessage = page.getByText(/Ambiente local: use o código \d{6}/);
  await expect(localMessage).toBeVisible();
  const code = (await localMessage.textContent())?.match(/\d{6}/)?.[0];
  expect(code).toBeTruthy();

  await page.getByLabel("Código de 6 dígitos").fill(code!);
  await page.getByRole("button", { name: "Ver saldo" }).click();
  await expect(page.getByText("Seu saldo atual:")).toBeVisible();
  await expect(page.getByText("1 ponto(s)", { exact: true })).toBeVisible();
});
