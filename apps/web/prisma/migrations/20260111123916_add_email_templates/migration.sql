-- CreateEnum
CREATE TYPE "EmailTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EmailTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "publishedVersionId" TEXT,
    "emailContentId" TEXT NOT NULL,
    "senderIdentityId" TEXT,
    "replyToIdentityId" TEXT,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "trackOpens" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_workspaceId_idx" ON "email_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "email_templates_workspaceId_status_idx" ON "email_templates"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "email_templates_workspaceId_deleted_at_idx" ON "email_templates"("workspaceId", "deleted_at");

-- CreateIndex
CREATE INDEX "email_templates_parentId_idx" ON "email_templates"("parentId");

-- CreateIndex
CREATE INDEX "email_templates_publishedVersionId_idx" ON "email_templates"("publishedVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_workspaceId_parentId_status_key" ON "email_templates"("workspaceId", "parentId", "status");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "email_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_emailContentId_fkey" FOREIGN KEY ("emailContentId") REFERENCES "EmailContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_senderIdentityId_fkey" FOREIGN KEY ("senderIdentityId") REFERENCES "SenderIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_replyToIdentityId_fkey" FOREIGN KEY ("replyToIdentityId") REFERENCES "SenderIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
