-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "confirmationToken" TEXT,
ADD COLUMN     "confirmationTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "contacts_confirmationToken_idx" ON "contacts"("confirmationToken");
