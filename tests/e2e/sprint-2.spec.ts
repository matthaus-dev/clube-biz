import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const merchantSlug = `painel-${suffix}`;
const email = `owner-${suffix}@test.local`;
const password = "PainelTeste123!";
const phoneSeed = parseInt(randomUUID().slice(0, 8), 16).toString().padStart(7, "0").slice(-7);
const customerPhone = `119${phoneSeed}1`;
const redemptionPhone = `119${phoneSeed}2`;
let merchantId: string;
let campaignId: string;
let registeredMerchantId: string | undefined;
let registeredCampaignId: string | undefined;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const merchant = await prisma.merchant.create({ data: { name: "Café do Painel", slug: merchantSlug } });
  merchantId = merchant.id;
  const campaign = await prisma.campaign.create({ data: { merchantId, name: "Clube do Café", status: "ACTIVE", pointsPerClaim: 1, rewardThreshold: 10, rewardTitle: "Café grátis", claimCooldownHours: 0, dailyClaimLimit: 50 } });
  campaignId = campaign.id;
  await prisma.reward.create({ data: { campaignId, name: "Café grátis", pointsCost: 10 } });
  await prisma.merchantUser.create({ data: { merchantId, name: "Owner Teste", emailNormalized: email, passwordHash: await hash(password), role: "OWNER", status: "ACTIVE" } });
});

test.afterAll(async () => {
  const campaignIds = [campaignId, registeredCampaignId].filter((id): id is string => Boolean(id));
  const merchantIds = [merchantId, registeredMerchantId].filter((id): id is string => Boolean(id));
  const memberships = await prisma.membership.findMany({ where: { campaignId: { in: campaignIds } }, select: { customerId: true } });
  const customerIds = memberships.map((item) => item.customerId);
  await prisma.passwordResetToken.deleteMany({ where: { merchantUser: { merchantId: { in: merchantIds } } } });
  await prisma.session.deleteMany({ where: { merchantUser: { merchantId: { in: merchantIds } } } });
  await prisma.auditLog.deleteMany({ where: { merchantId: { in: merchantIds } } });
  await prisma.qrClaim.deleteMany({ where: { qrCode: { campaignId: { in: campaignIds } } } });
  await prisma.pointTransaction.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.redemption.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.membership.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.qrCode.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.reward.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
  await prisma.merchantUser.deleteMany({ where: { merchantId: { in: merchantIds } } });
  await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
  if (customerIds.length) await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.$disconnect();
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { name: "Olá, Café do Painel" })).toBeVisible();
}

test("login, dashboard, customer and manual credit", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Registrar pontos" }).click();
  await page.getByLabel("Celular").fill(customerPhone);
  await page.getByLabel("Pontos").fill("3");
  await page.getByLabel("Motivo").fill("Compra balcão");
  await page.getByRole("button", { name: "Registrar pontos" }).click();
  await expect(page.getByText(/Novo saldo: 3/)).toBeVisible();
  await page.getByRole("link", { name: "Clientes" }).click();
  await expect(page.getByText(`+55 •••••• ${customerPhone.slice(-4)}`)).toBeVisible();
  await page.getByRole("link", { name: "Ver detalhes" }).click();
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
});

test("registers a merchant with card settings", async ({ page }) => {
  const registerEmail = `novo-${suffix}@test.local`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome publico").fill("Bistro Novo");
  await page.getByLabel("Texto da recompensa").fill("Almoco gratis");
  await page.getByLabel("Meta").fill("8");
  await page.getByLabel("Nome", { exact: true }).fill("Lojista Novo");
  await page.getByLabel("E-mail").fill(registerEmail);
  await page.getByLabel("Senha", { exact: true }).fill("CadastroNovo123!");
  await page.getByLabel("Repetir senha").fill("CadastroNovo123!");
  await page.getByRole("button", { name: "Criar cadastro" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { name: "Olá, Bistro Novo" })).toBeVisible();

  const user = await prisma.merchantUser.findUniqueOrThrow({
    where: { emailNormalized: registerEmail },
    include: { merchant: { include: { campaigns: true } } },
  });
  registeredMerchantId = user.merchantId;
  registeredCampaignId = user.merchant.campaigns[0]?.id;
  expect(user.status).toBe("ACTIVE");
  expect(user.role).toBe("OWNER");
});

test("redeems and cancels a reward", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Registrar pontos" }).click();
  await page.getByLabel("Celular").fill(redemptionPhone);
  await page.getByLabel("Pontos").fill("10");
  await page.getByLabel("Motivo").fill("Carga para resgate");
  await page.getByRole("button", { name: "Registrar pontos" }).click();
  await expect(page.getByText(/Novo saldo: 10/)).toBeVisible();
  await page.getByRole("link", { name: "Resgates" }).click();
  await page.getByLabel("Cliente").selectOption({ label: `+55 •••••• ${redemptionPhone.slice(-4)} — saldo 10` });
  await page.getByLabel("Recompensa").selectOption({ label: "Café grátis — 10 pontos" });
  await page.getByRole("button", { name: "Confirmar resgate" }).click();
  await expect(page.getByText("Resgate confirmado: 10 ponto(s).")).toBeVisible();
  page.once("dialog", async (dialog) => dialog.accept("Cliente desistiu"));
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("CANCELLED")).toBeVisible();
});

test("revokes logout and rejects a disabled user session", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page);
  await prisma.merchantUser.updateMany({ where: { merchantId, emailNormalized: email }, data: { status: "DISABLED" } });
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login$/);
});
