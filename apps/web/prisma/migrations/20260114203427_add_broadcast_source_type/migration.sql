-- CreateEnum
CREATE TYPE "BroadcastSource" AS ENUM ('DASHBOARD', 'API');

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "sourceType" "BroadcastSource" NOT NULL DEFAULT 'DASHBOARD';

-- RenameIndex
ALTER INDEX "unique_template_slug_per_workspace" RENAME TO "email_templates_workspaceId_uniqueSlug_key";
