-- AlterTable
ALTER TABLE "SendingDomain" ADD COLUMN     "sslIssuanceError" TEXT,
ADD COLUMN     "sslIssuanceStartedAt" TIMESTAMP(3),
ADD COLUMN     "sslIssuanceStatus" TEXT;

-- Set status for existing domains based on current state
-- Domains with SSL cert issued -> "completed"
UPDATE "SendingDomain"
SET "sslIssuanceStatus" = 'completed',
    "sslIssuanceStartedAt" = "trackingDomainSslVerifiedAt"
WHERE "trackingDomainSslVerifiedAt" IS NOT NULL;

-- Domains with tracking DNS verified but no SSL cert -> "pending"
UPDATE "SendingDomain"
SET "sslIssuanceStatus" = 'pending'
WHERE "trackingDomainVerifiedAt" IS NOT NULL
  AND "trackingDomainSslVerifiedAt" IS NULL
  AND "sslIssuanceStatus" IS NULL;
