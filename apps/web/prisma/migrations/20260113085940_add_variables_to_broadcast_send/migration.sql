-- AlterTable
ALTER TABLE "broadcast_sends" ADD COLUMN     "variables" JSONB,
ALTER COLUMN "contactId" DROP NOT NULL;
