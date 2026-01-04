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
  logger.info({ jobId }, "Starting SSL certificate renewal check");

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - RENEWAL_THRESHOLD_DAYS);

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
    logger.info({ jobId }, "No certificates need renewal");
    return;
  }

  logger.info(
    { jobId, count: domainsNeedingRenewal.length },
    "Found certificates needing renewal",
  );

  // Queue renewal jobs for each domain
  const renewalJobs = domainsNeedingRenewal.map((domain) => {
    // trackingDomainSslVerifiedAt is guaranteed non-null by the query filter
    const sslVerifiedAt = domain.trackingDomainSslVerifiedAt!;
    const daysOld = Math.floor(
      (Date.now() - sslVerifiedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    logger.info(
      {
        jobId,
        domainId: domain.id,
        domainName: domain.name,
        trackingDomain: `${domain.trackingSubDomain}.${domain.name}`,
        daysOld,
      },
      "Queuing SSL renewal",
    );

    return {
      name: "issue-tracking-ssl" as const,
      data: { domainId: domain.id },
    };
  });

  // Push all renewal jobs to the queue
  await queue("sending-domains").pushBulk(renewalJobs);

  logger.info(
    { jobId, count: renewalJobs.length },
    "SSL renewal jobs queued successfully",
  );
};
