-- CreateEnum
CREATE TYPE "BroadcastSendStatus" AS ENUM ('QUEUED', 'SENDING', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "detailsPruned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statsRecomputedAt" TIMESTAMP(3),
ADD COLUMN     "totalBounced" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalClicked" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalComplained" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalDelivered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalOpened" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalQueued" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalUnsubscribed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EmailContent" ADD COLUMN     "variables" JSONB;

-- AlterTable
ALTER TABLE "SendingDomain" ALTER COLUMN "maxSendPerDay" SET DEFAULT 1000,
ALTER COLUMN "maxSendPerHour" SET DEFAULT 200;

-- CreateTable
CREATE TABLE "broadcast_sends" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sendingId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "BroadcastSendStatus" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "firstOpenedAt" TIMESTAMP(3),
    "firstClickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueLinksClicked" INTEGER NOT NULL DEFAULT 0,
    "bounceClassification" TEXT,
    "lastResponseCode" INTEGER,
    "lastResponseMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_sends_sendingId_key" ON "broadcast_sends"("sendingId");

-- CreateIndex
CREATE INDEX "broadcast_sends_broadcastId_idx" ON "broadcast_sends"("broadcastId");

-- CreateIndex
CREATE INDEX "broadcast_sends_broadcastId_status_idx" ON "broadcast_sends"("broadcastId", "status");

-- CreateIndex
CREATE INDEX "broadcast_sends_workspaceId_idx" ON "broadcast_sends"("workspaceId");

-- CreateIndex
CREATE INDEX "broadcast_sends_contactId_idx" ON "broadcast_sends"("contactId");

-- CreateIndex
CREATE INDEX "broadcast_sends_broadcastId_contactId_openCount_idx" ON "broadcast_sends"("broadcastId", "contactId", "openCount");

-- CreateIndex
CREATE INDEX "broadcast_sends_broadcastId_contactId_clickCount_idx" ON "broadcast_sends"("broadcastId", "contactId", "clickCount");

-- CreateIndex
CREATE INDEX "broadcast_sends_createdAt_idx" ON "broadcast_sends"("createdAt");

-- CreateIndex
CREATE INDEX "broadcast_sends_sendingId_idx" ON "broadcast_sends"("sendingId");

-- AddForeignKey
ALTER TABLE "broadcast_sends" ADD CONSTRAINT "broadcast_sends_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
