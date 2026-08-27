ALTER TABLE "QrCode" ADD COLUMN "publicToken" TEXT;

CREATE UNIQUE INDEX "QrCode_publicToken_key" ON "QrCode"("publicToken");
