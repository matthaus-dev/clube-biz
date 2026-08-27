-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "merchantUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_merchantUserId_expiresAt_idx" ON "Session"("merchantUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_revokedAt_idx" ON "Session"("expiresAt", "revokedAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_merchantUserId_fkey" FOREIGN KEY ("merchantUserId") REFERENCES "MerchantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
