-- DropForeignKey
ALTER TABLE "email_templates" DROP CONSTRAINT "email_templates_emailContentId_fkey";

-- AlterTable
ALTER TABLE "email_templates" ALTER COLUMN "emailContentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_emailContentId_fkey" FOREIGN KEY ("emailContentId") REFERENCES "EmailContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
