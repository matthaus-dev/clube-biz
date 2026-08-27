-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MerchantRole" AS ENUM ('OWNER', 'MANAGER', 'ATTENDANT');

-- CreateEnum
CREATE TYPE "MerchantUserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT', 'REVERSAL', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "PointTransactionSource" AS ENUM ('STATIC_QR', 'DYNAMIC_QR', 'DELIVERY_QR', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PointTransactionStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QrCodeKind" AS ENUM ('STATIC', 'DYNAMIC', 'DELIVERY');

-- CreateEnum
CREATE TYPE "QrCodeStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "QrClaimStatus" AS ENUM ('SUCCEEDED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ChallengeChannel" AS ENUM ('SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ChallengePurpose" AS ENUM ('CLAIM', 'BALANCE_LOOKUP');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'BLOCKED');

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantUser" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "MerchantRole" NOT NULL DEFAULT 'ATTENDANT',
    "status" "MerchantUserStatus" NOT NULL DEFAULT 'INVITED',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phoneEncrypted" TEXT,
    "phoneHash" TEXT,
    "cpfEncrypted" TEXT,
    "cpfHash" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "pointsPerClaim" INTEGER NOT NULL DEFAULT 1,
    "rewardThreshold" INTEGER NOT NULL DEFAULT 10,
    "rewardTitle" TEXT NOT NULL,
    "claimCooldownHours" INTEGER NOT NULL DEFAULT 12,
    "dailyClaimLimit" INTEGER NOT NULL DEFAULT 2,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRedeemed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "type" "PointTransactionType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "source" "PointTransactionSource" NOT NULL,
    "status" "PointTransactionStatus" NOT NULL DEFAULT 'POSTED',
    "idempotencyKey" TEXT NOT NULL,
    "reasonCode" TEXT,
    "note" TEXT,
    "qrCodeId" TEXT,
    "redemptionId" TEXT,
    "actorMerchantUserId" TEXT,
    "requestFingerprint" TEXT,
    "reversesTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "idempotencyKey" TEXT NOT NULL,
    "actorMerchantUserId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrCode" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" "QrCodeKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "QrCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "points" INTEGER NOT NULL,
    "orderReference" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrClaim" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "membershipId" TEXT,
    "pointTransactionId" TEXT,
    "status" "QrClaimStatus" NOT NULL,
    "reasonCode" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityChallenge" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "campaignId" TEXT NOT NULL,
    "channel" "ChallengeChannel" NOT NULL,
    "destinationHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "ChallengePurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT,
    "actorMerchantUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

-- CreateIndex
CREATE INDEX "MerchantUser_merchantId_status_idx" ON "MerchantUser"("merchantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantUser_merchantId_emailNormalized_key" ON "MerchantUser"("merchantId", "emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phoneHash_key" ON "Customer"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cpfHash_key" ON "Customer"("cpfHash");

-- CreateIndex
CREATE INDEX "Campaign_merchantId_status_idx" ON "Campaign"("merchantId", "status");

-- CreateIndex
CREATE INDEX "Membership_customerId_idx" ON "Membership"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_campaignId_customerId_key" ON "Membership"("campaignId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_redemptionId_key" ON "PointTransaction"("redemptionId");

-- CreateIndex
CREATE INDEX "PointTransaction_membershipId_createdAt_idx" ON "PointTransaction"("membershipId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_merchantId_createdAt_idx" ON "PointTransaction"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_campaignId_createdAt_idx" ON "PointTransaction"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_merchantId_idempotencyKey_key" ON "PointTransaction"("merchantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Reward_campaignId_status_idx" ON "Reward"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Redemption_membershipId_createdAt_idx" ON "Redemption"("membershipId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_merchantId_idempotencyKey_key" ON "Redemption"("merchantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_tokenHash_key" ON "QrCode"("tokenHash");

-- CreateIndex
CREATE INDEX "QrCode_merchantId_kind_status_idx" ON "QrCode"("merchantId", "kind", "status");

-- CreateIndex
CREATE INDEX "QrCode_campaignId_status_idx" ON "QrCode"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QrClaim_pointTransactionId_key" ON "QrClaim"("pointTransactionId");

-- CreateIndex
CREATE INDEX "QrClaim_customerId_claimedAt_idx" ON "QrClaim"("customerId", "claimedAt");

-- CreateIndex
CREATE INDEX "QrClaim_qrCodeId_claimedAt_idx" ON "QrClaim"("qrCodeId", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrClaim_qrCodeId_idempotencyKey_key" ON "QrClaim"("qrCodeId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "IdentityChallenge_destinationHash_purpose_createdAt_idx" ON "IdentityChallenge"("destinationHash", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityChallenge_campaignId_status_idx" ON "IdentityChallenge"("campaignId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_merchantId_createdAt_idx" ON "AuditLog"("merchantId", "createdAt");

-- AddForeignKey
ALTER TABLE "MerchantUser" ADD CONSTRAINT "MerchantUser_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_actorMerchantUserId_fkey" FOREIGN KEY ("actorMerchantUserId") REFERENCES "MerchantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_reversesTransactionId_fkey" FOREIGN KEY ("reversesTransactionId") REFERENCES "PointTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_actorMerchantUserId_fkey" FOREIGN KEY ("actorMerchantUserId") REFERENCES "MerchantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "MerchantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrClaim" ADD CONSTRAINT "QrClaim_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrClaim" ADD CONSTRAINT "QrClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrClaim" ADD CONSTRAINT "QrClaim_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrClaim" ADD CONSTRAINT "QrClaim_pointTransactionId_fkey" FOREIGN KEY ("pointTransactionId") REFERENCES "PointTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityChallenge" ADD CONSTRAINT "IdentityChallenge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityChallenge" ADD CONSTRAINT "IdentityChallenge_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorMerchantUserId_fkey" FOREIGN KEY ("actorMerchantUserId") REFERENCES "MerchantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain invariants not expressible in Prisma Schema Language.
ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_has_identity" CHECK ("phoneHash" IS NOT NULL OR "cpfHash" IS NOT NULL);

ALTER TABLE "Campaign"
  ADD CONSTRAINT "Campaign_positive_rules" CHECK (
    "pointsPerClaim" > 0 AND
    "rewardThreshold" > 0 AND
    "claimCooldownHours" >= 0 AND
    "dailyClaimLimit" > 0
  );

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_non_negative_balances" CHECK (
    "balance" >= 0 AND
    "lifetimeEarned" >= 0 AND
    "lifetimeRedeemed" >= 0
  );

ALTER TABLE "PointTransaction"
  ADD CONSTRAINT "PointTransaction_non_zero_delta" CHECK ("pointsDelta" <> 0);

ALTER TABLE "Reward"
  ADD CONSTRAINT "Reward_positive_cost" CHECK ("pointsCost" > 0);

ALTER TABLE "Redemption"
  ADD CONSTRAINT "Redemption_positive_points" CHECK ("pointsSpent" > 0);

ALTER TABLE "QrCode"
  ADD CONSTRAINT "QrCode_valid_usage" CHECK (
    "points" > 0 AND
    "usedCount" >= 0 AND
    ("maxUses" IS NULL OR "maxUses" > 0) AND
    ("maxUses" IS NULL OR "usedCount" <= "maxUses")
  );

ALTER TABLE "IdentityChallenge"
  ADD CONSTRAINT "IdentityChallenge_non_negative_attempts" CHECK ("attempts" >= 0);

CREATE UNIQUE INDEX "Campaign_one_active_per_merchant"
  ON "Campaign" ("merchantId")
  WHERE "status" = 'ACTIVE';
