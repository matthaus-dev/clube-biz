ALTER TABLE "MerchantUser" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';

UPDATE "MerchantUser"
SET "name" = "emailNormalized"
WHERE "name" = '';

CREATE UNIQUE INDEX "MerchantUser_emailNormalized_key" ON "MerchantUser"("emailNormalized");

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "merchantUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_merchantUserId_expiresAt_idx" ON "PasswordResetToken"("merchantUserId", "expiresAt");
CREATE INDEX "PasswordResetToken_expiresAt_usedAt_idx" ON "PasswordResetToken"("expiresAt", "usedAt");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_merchantUserId_fkey" FOREIGN KEY ("merchantUserId") REFERENCES "MerchantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
