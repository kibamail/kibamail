-- CreateEnum
CREATE TYPE "TransactionalEmailStatus" AS ENUM ('QUEUED', 'SENDING', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateTable
CREATE TABLE "transactional_emails" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sendingId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "replyToEmail" TEXT,
    "replyToName" TEXT,
    "sendingDomainId" TEXT,
    "senderIdentityId" TEXT,
    "toEmails" JSONB NOT NULL,
    "ccEmails" JSONB,
    "bccEmails" JSONB,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "contentS3Key" TEXT,
    "hasHtmlContent" BOOLEAN NOT NULL DEFAULT true,
    "hasTextContent" BOOLEAN NOT NULL DEFAULT false,
    "status" "TransactionalEmailStatus" NOT NULL DEFAULT 'QUEUED',
    "lastResponseCode" INTEGER,
    "lastResponseMessage" TEXT,
    "bounceClassification" TEXT,
    "openTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "clickTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "firstOpenedAt" TIMESTAMP(3),
    "firstClickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueLinksClicked" INTEGER NOT NULL DEFAULT 0,
    "totalEvents" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "transactional_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactional_emails_sendingId_key" ON "transactional_emails"("sendingId");

-- CreateIndex
CREATE INDEX "transactional_emails_workspaceId_idx" ON "transactional_emails"("workspaceId");

-- CreateIndex
CREATE INDEX "transactional_emails_workspaceId_status_idx" ON "transactional_emails"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "transactional_emails_workspaceId_createdAt_idx" ON "transactional_emails"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "transactional_emails_workspaceId_fromEmail_idx" ON "transactional_emails"("workspaceId", "fromEmail");

-- CreateIndex
CREATE INDEX "transactional_emails_sendingId_idx" ON "transactional_emails"("sendingId");

-- CreateIndex
CREATE INDEX "transactional_emails_sendingDomainId_idx" ON "transactional_emails"("sendingDomainId");

-- CreateIndex
CREATE INDEX "transactional_emails_senderIdentityId_idx" ON "transactional_emails"("senderIdentityId");

-- CreateIndex
CREATE INDEX "transactional_emails_status_idx" ON "transactional_emails"("status");

-- CreateIndex
CREATE INDEX "transactional_emails_createdAt_idx" ON "transactional_emails"("createdAt");

-- CreateIndex
CREATE INDEX "transactional_emails_status_createdAt_idx" ON "transactional_emails"("status", "createdAt");
