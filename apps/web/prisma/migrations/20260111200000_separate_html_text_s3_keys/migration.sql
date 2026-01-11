-- Add new S3 key columns for HTML and text content
ALTER TABLE "transactional_emails" ADD COLUMN "htmlContentS3Key" TEXT;
ALTER TABLE "transactional_emails" ADD COLUMN "textContentS3Key" TEXT;

-- Drop old columns
ALTER TABLE "transactional_emails" DROP COLUMN "contentS3Key";
ALTER TABLE "transactional_emails" DROP COLUMN "hasHtmlContent";
ALTER TABLE "transactional_emails" DROP COLUMN "hasTextContent";
