ALTER TABLE "Customer" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "emailNormalized" TEXT;

CREATE INDEX "Customer_emailNormalized_idx" ON "Customer"("emailNormalized");
