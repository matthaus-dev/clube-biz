CREATE TYPE "CustomerConsentPurpose" AS ENUM ('WELCOME_WHATSAPP');
CREATE TYPE "CustomerConsentSource" AS ENUM ('QR_REGISTRATION');
CREATE TYPE "MessageKind" AS ENUM ('WELCOME_WHATSAPP');
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "CustomerConsent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purpose" "CustomerConsentPurpose" NOT NULL,
    "source" "CustomerConsentSource" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageDelivery" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "status" "MessageDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerConsent_customerId_purpose_key" ON "CustomerConsent"("customerId", "purpose");
CREATE INDEX "CustomerConsent_purpose_grantedAt_idx" ON "CustomerConsent"("purpose", "grantedAt");
CREATE UNIQUE INDEX "MessageDelivery_customerId_kind_key" ON "MessageDelivery"("customerId", "kind");
CREATE INDEX "MessageDelivery_status_createdAt_idx" ON "MessageDelivery"("status", "createdAt");

ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
