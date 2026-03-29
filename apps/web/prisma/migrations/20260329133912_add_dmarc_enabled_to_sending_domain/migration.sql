-- DropIndex
DROP INDEX "automation_runs_automationId_contactId_key";

-- AlterTable
ALTER TABLE "SendingDomain" ADD COLUMN     "dmarcEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "automation_runs" ADD COLUMN     "pendingJobId" TEXT;

-- CreateIndex
CREATE INDEX "automation_runs_automationId_contactId_idx" ON "automation_runs"("automationId", "contactId");
