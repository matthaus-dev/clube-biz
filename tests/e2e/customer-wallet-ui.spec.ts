import { expect, test, type Page } from "@playwright/test";

const card = { merchantName: "Café de teste", campaignName: "Café de teste", rewardTitle: "Um café grátis", balance: 3, rewardThreshold: 12, history: [{ type: "CREDIT", pointsDelta: 3, createdAt: "2026-09-24T12:00:00Z" }] };

async function start(page: Page) {
  await page.route("**/api/public/balance/challenge", (route) => route.fulfill({ json: { challengeId: "test-challenge" } }));
  await page.goto("/saldo");
  await page.getByLabel("WhatsApp", { exact: true }).fill("11999990000");
  await page.getByRole("button", { name: "Enviar código pelo WhatsApp" }).click();
  await expect(page.getByRole("heading", { name: "Confirme seu celular." })).toBeFocused();
  await expect(page.getByText(/celular com final 0000/)).toBeVisible();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
}

test("wallet shows all twelve stamps and history per merchant without horizontal overflow", async ({ page }, testInfo) => {
  await page.route("**/api/public/balance/verify", (route) => route.fulfill({ json: { cards: [card, { ...card, merchantName: "Padaria de teste", balance: 13, history: [] }] } }));
  await start(page);
  await page.getByRole("button", { name: "Ver meus cartões", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Meus cartões", exact: true })).toBeFocused();
  const stamps = page.getByRole("img", { name: "3 de 12 selos preenchidos" });
  await expect(stamps.locator("span")).toHaveCount(12);
  await expect(page.getByText("Faltam 9 pontos para sua recompensa.")).toBeVisible();
  await expect(page.getByText("13 de 12 pontos")).toBeVisible();
  await expect(page.getByText("Peça o resgate à equipe da loja.")).toBeVisible();
  await page.getByText("Últimas movimentações de Café de teste").click();
  await expect(page.getByText("+3 pontos", { exact: true })).toBeVisible();
  await page.getByText("Últimas movimentações de Padaria de teste").click();
  await expect(page.getByText("Nenhuma movimentação recente neste cartão.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("wallet.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".public-card").evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth; })).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("wallet-320.png"), fullPage: true });
});

test("invalid verification preserves code form; retry can show empty wallet", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/public/balance/verify", (route) => route.fulfill(++attempts === 1 ? { status: 400, json: { error: "Código inválido ou expirado." } } : { json: { cards: [] } }));
  await start(page);
  await page.getByRole("button", { name: "Ver meus cartões", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Código inválido ou expirado.");
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Ver meus cartões", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Você ainda não tem cartões ativos.");
});

test("customer can correct phone without revealing wallet", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "Corrigir número ou pedir novo código" }).click();
  await expect(page.getByLabel("WhatsApp", { exact: true })).toHaveValue("(11) 99999-0000");
  await expect(page.getByLabel("Código de 6 dígitos")).toHaveCount(0);
});

test("challenge failure remains neutral and does not show cards", async ({ page }) => {
  await page.route("**/api/public/balance/challenge", (route) => route.fulfill({ status: 429, json: { error: "Aguarde antes de tentar novamente." } }));
  await page.goto("/saldo");
  await page.getByLabel("WhatsApp", { exact: true }).fill("11999990000");
  await page.getByRole("button", { name: "Enviar código pelo WhatsApp" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Aguarde antes de tentar novamente.");
  await expect(page.getByRole("article")).toHaveCount(0);
});
