import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { getEnv } from "../src/lib/env";
import { hashOpaqueToken, keyedHash } from "../src/lib/security/hash";
import { encryptPii } from "../src/lib/security/pii";
import { normalizePhone } from "../src/modules/customers/domain/identity";

const prisma = new PrismaClient();

async function main() {
  const env = getEnv();
  const merchant = await prisma.merchant.upsert({
    where: { slug: "pizzaria-demo" },
    update: { name: "Pizzaria Demo", status: "ACTIVE" },
    create: { name: "Pizzaria Demo", slug: "pizzaria-demo", status: "ACTIVE" },
  });

  const developmentPassword = env.DEV_MERCHANT_PASSWORD ?? "ClubeBiz123!";
  const developmentPasswordHash = await hash(developmentPassword, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });

  await prisma.merchantUser.upsert({
    where: { merchantId_emailNormalized: { merchantId: merchant.id, emailNormalized: "dono@demo.local" } },
    update: { name: "Dono Demo", role: "OWNER", status: "ACTIVE", passwordHash: developmentPasswordHash },
    create: {
      merchantId: merchant.id,
      name: "Dono Demo",
      emailNormalized: "dono@demo.local",
      role: "OWNER",
      status: "ACTIVE",
      passwordHash: developmentPasswordHash,
    },
  });

  let campaign = await prisma.campaign.findFirst({ where: { merchantId: merchant.id, name: "Clube da Pizza" } });
  campaign ??= await prisma.campaign.create({
    data: {
      merchantId: merchant.id,
      name: "Clube da Pizza",
      status: "ACTIVE",
      pointsPerClaim: 1,
      rewardThreshold: 10,
      rewardTitle: "Uma pizza grátis",
      claimCooldownHours: 12,
      dailyClaimLimit: 2,
    },
  });

  const reward = await prisma.reward.findFirst({ where: { campaignId: campaign.id, name: "Pizza grátis" } });
  if (!reward) {
    await prisma.reward.create({
      data: { campaignId: campaign.id, name: "Pizza grátis", pointsCost: 10, status: "ACTIVE" },
    });
  }

  const qrToken = env.DEV_QR_TOKEN ?? "clube-biz-demo-qr";
  await prisma.qrCode.upsert({
    where: { tokenHash: hashOpaqueToken(qrToken) },
    update: { status: "ACTIVE", campaignId: campaign.id, merchantId: merchant.id, publicToken: qrToken },
    create: {
      merchantId: merchant.id,
      campaignId: campaign.id,
      kind: "STATIC",
      tokenHash: hashOpaqueToken(qrToken),
      publicToken: qrToken,
      points: 1,
    },
  });

  for (const rawPhone of ["11987654321", "11912345678"]) {
    const phone = normalizePhone(rawPhone);
    const phoneHash = keyedHash(phone, env.PII_HASH_PEPPER);
    const customer = await prisma.customer.upsert({
      where: { phoneHash },
      update: {},
      create: { phoneHash, phoneEncrypted: encryptPii(phone, env.PII_ENCRYPTION_KEY) },
    });
    await prisma.membership.upsert({
      where: { campaignId_customerId: { campaignId: campaign.id, customerId: customer.id } },
      update: {},
      create: { campaignId: campaign.id, customerId: customer.id },
    });
  }

  process.stdout.write(`Seed concluído. QR local: ${env.APP_URL}/r/${qrToken}. Login local: dono@demo.local\n`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
