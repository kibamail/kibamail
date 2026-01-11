-- Step 1: Add toEmail column as nullable first
ALTER TABLE "transactional_emails" ADD COLUMN "toEmail" TEXT;

-- Step 2: Copy data from toEmails JSON array to toEmail string (taking first element)
UPDATE "transactional_emails"
SET "toEmail" = "toEmails"->>0
WHERE "toEmails" IS NOT NULL;

-- Step 3: Make toEmail NOT NULL (after data is migrated)
ALTER TABLE "transactional_emails" ALTER COLUMN "toEmail" SET NOT NULL;

-- Step 4: Drop the old JSON columns
ALTER TABLE "transactional_emails" DROP COLUMN "toEmails";
ALTER TABLE "transactional_emails" DROP COLUMN "ccEmails";
ALTER TABLE "transactional_emails" DROP COLUMN "bccEmails";

-- Step 5: Add index on toEmail
CREATE INDEX "transactional_emails_workspaceId_toEmail_idx" ON "transactional_emails"("workspaceId", "toEmail");
