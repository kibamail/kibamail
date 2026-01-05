/**
 * Renew Expiring SSL Certificates Job
 *
 * Scheduled job that runs every 24 hours to find SSL certificates
 * expiring within 30 days and triggers renewal for each.
 *
 * Let's Encrypt certificates are valid for 90 days.
 * We renew 30 days before expiry (when cert is 60+ days old).
 */

import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queue, queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "renew-expiring-ssl" });

// Certificates older than 60 days should be renewed (90 day validity - 30 day buffer)
const RENEWAL_THRESHOLD_DAYS = 60;

export const renewExpiringSsl: JobProcessor<
  "sending-domains",
  "renew-expiring-ssl"
> = async (_data, jobId) => {
  logger.info(
    { jobId, renewalThresholdDays: RENEWAL_THRESHOLD_DAYS },
    "=== SSL CERTIFICATE RENEWAL CHECK STARTED ===",
  );

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - RENEWAL_THRESHOLD_DAYS);

  logger.info(
    {
      jobId,
      thresholdDate: thresholdDate.toISOString(),
      lookingForCertsOlderThan: `${RENEWAL_THRESHOLD_DAYS} days`,
    },
    "Searching for certificates issued before threshold date",
  );

  // Find all domains with SSL certificates issued before the threshold
  const domainsNeedingRenewal = await prisma.sendingDomain.findMany({
    where: {
      trackingDomainSslVerifiedAt: {
        not: null,
        lt: thresholdDate,
      },
      // Only renew if tracking DNS is still verified
      trackingDomainVerifiedAt: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      trackingSubDomain: true,
      trackingDomainSslVerifiedAt: true,
    },
  });

  if (domainsNeedingRenewal.length === 0) {
    logger.info(
      { jobId, thresholdDate: thresholdDate.toISOString() },
      "No certificates need renewal - all certificates are within the valid period",
    );
    return;
  }

  logger.info(
    { jobId, count: domainsNeedingRenewal.length },
    "=== FOUND CERTIFICATES NEEDING RENEWAL ===",
  );

  // Queue renewal jobs for each domain
  const renewalJobs = domainsNeedingRenewal.map((domain) => {
    // trackingDomainSslVerifiedAt is guaranteed non-null by the query filter
    const sslVerifiedAt = domain.trackingDomainSslVerifiedAt!;
    const daysOld = Math.floor(
      (Date.now() - sslVerifiedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysUntilExpiry = 90 - daysOld;
    const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;

    logger.info(
      {
        jobId,
        domainId: domain.id,
        domainName: domain.name,
        trackingDomain,
        certificateIssuedAt: sslVerifiedAt.toISOString(),
        certificateAgeDays: daysOld,
        daysUntilExpiry,
        status: daysUntilExpiry <= 0 ? "EXPIRED" : "EXPIRING_SOON",
      },
      "Queuing SSL certificate renewal for domain",
    );

    return {
      name: "issue-tracking-ssl" as const,
      data: { domainId: domain.id },
    };
  });

  // Push all renewal jobs to the queue
  logger.info(
    { jobId, count: renewalJobs.length },
    "Pushing renewal jobs to queue",
  );

  await queue("sending-domains").pushBulk(renewalJobs);

  logger.info(
    { jobId, count: renewalJobs.length },
    "=== SSL CERTIFICATE RENEWAL CHECK COMPLETED - RENEWAL JOBS QUEUED ===",
  );
};
