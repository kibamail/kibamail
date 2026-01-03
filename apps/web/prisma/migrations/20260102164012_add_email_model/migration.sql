-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('TRANSACTIONAL', 'AUTOMATION', 'NOTIFICATION');

-- AlterTable
ALTER TABLE "forms" ADD COLUMN     "doubleOptInEmailId" TEXT;

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "previewText" TEXT,
    "content" JSONB,
    "styles" JSONB,
    "senderIdentityId" TEXT,
    "replyToIdentityId" TEXT,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "trackOpens" BOOLEAN NOT NULL DEFAULT true,
    "type" "EmailType" NOT NULL DEFAULT 'TRANSACTIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emails_workspaceId_idx" ON "emails"("workspaceId");

-- CreateIndex
CREATE INDEX "emails_workspaceId_type_idx" ON "emails"("workspaceId", "type");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_doubleOptInEmailId_fkey" FOREIGN KEY ("doubleOptInEmailId") REFERENCES "emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;
