-- AlterTable: Add dmarcReportingCode and dmarcVerifiedAt columns
-- First add as nullable, then populate existing rows, then make NOT NULL

-- Step 1: Add columns (dmarcReportingCode as nullable initially)
ALTER TABLE `SendingDomain` ADD COLUMN `dmarcReportingCode` VARCHAR(10) NULL,
    ADD COLUMN `dmarcVerifiedAt` DATETIME(3) NULL;

-- Step 2: Generate random 10-char lowercase codes for existing rows
UPDATE `SendingDomain`
SET `dmarcReportingCode` = LOWER(SUBSTRING(MD5(RAND()), 1, 10))
WHERE `dmarcReportingCode` IS NULL;

-- Step 3: Make dmarcReportingCode NOT NULL
ALTER TABLE `SendingDomain` MODIFY COLUMN `dmarcReportingCode` VARCHAR(10) NOT NULL;

-- AlterTable
ALTER TABLE `contact_imports` MODIFY `status` ENUM('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
