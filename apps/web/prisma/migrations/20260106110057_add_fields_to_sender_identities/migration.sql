/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,slug]` on the table `forms` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ConversationOriginType" AS ENUM ('BROADCAST', 'DOUBLE_OPT_IN', 'AUTOMATION', 'TRANSACTIONAL', 'UNSOLICITED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "InboxMessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- AlterTable
ALTER TABLE "SendingDomain" ADD COLUMN     "inboxEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "inboxMxVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "forms" ADD COLUMN     "seoDescription" VARCHAR(500),
ADD COLUMN     "seoFaviconUrl" VARCHAR(2000),
ADD COLUMN     "seoImageUrl" VARCHAR(2000),
ADD COLUMN     "seoTitle" VARCHAR(200),
ADD COLUMN     "slug" VARCHAR(100);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "senderIdentityId" TEXT,
    "sendingDomainId" TEXT NOT NULL,
    "originType" "ConversationOriginType" NOT NULL,
    "originId" TEXT,
    "originEmailSendId" TEXT,
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 1,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_messages" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "emailSendId" TEXT NOT NULL,
    "inReplyToEmailSendId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "rawEmail" TEXT,
    "contentS3Key" TEXT,
    "messageId" TEXT,
    "inReplyToHeader" TEXT,
    "referencesHeader" TEXT,
    "status" "InboxMessageStatus" NOT NULL DEFAULT 'UNREAD',
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_attachments" (
    "id" TEXT NOT NULL,
    "inboxMessageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "contentId" TEXT,
    "isInline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_originEmailSendId_key" ON "conversations"("originEmailSendId");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_idx" ON "conversations"("workspaceId");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_status_idx" ON "conversations"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_lastMessageAt_idx" ON "conversations"("workspaceId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_contactId_idx" ON "conversations"("contactId");

-- CreateIndex
CREATE INDEX "conversations_senderIdentityId_idx" ON "conversations"("senderIdentityId");

-- CreateIndex
CREATE INDEX "conversations_sendingDomainId_idx" ON "conversations"("sendingDomainId");

-- CreateIndex
CREATE INDEX "inbox_messages_workspaceId_idx" ON "inbox_messages"("workspaceId");

-- CreateIndex
CREATE INDEX "inbox_messages_conversationId_idx" ON "inbox_messages"("conversationId");

-- CreateIndex
CREATE INDEX "inbox_messages_emailSendId_idx" ON "inbox_messages"("emailSendId");

-- CreateIndex
CREATE INDEX "inbox_messages_workspaceId_status_idx" ON "inbox_messages"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "inbox_messages_conversationId_createdAt_idx" ON "inbox_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "inbox_attachments_inboxMessageId_idx" ON "inbox_attachments"("inboxMessageId");

-- CreateIndex
CREATE INDEX "forms_slug_idx" ON "forms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "forms_workspaceId_slug_key" ON "forms"("workspaceId", "slug");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_senderIdentityId_fkey" FOREIGN KEY ("senderIdentityId") REFERENCES "SenderIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_sendingDomainId_fkey" FOREIGN KEY ("sendingDomainId") REFERENCES "SendingDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_attachments" ADD CONSTRAINT "inbox_attachments_inboxMessageId_fkey" FOREIGN KEY ("inboxMessageId") REFERENCES "inbox_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
