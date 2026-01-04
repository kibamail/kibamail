/**
 * Check Tracking Domain DNS Configuration Job
 *
 * Verifies that a customer's tracking domain CNAME is properly configured
 * to point to our tracking server (e.kbmta.net).
 *
 * Flow:
 * 1. Lookup CNAME record for tracking domain
 * 2. Verify it points to the expected target
 * 3. If verified, queue SSL certificate issuance
 * 4. If not verified, retry after delay (up to max attempts)
 */

import { promises as dns } from "node:dns";
import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queue, queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "check-tracking-dns" });

const MAX_ATTEMPTS = 20; // ~10 minutes of retries
const RETRY_DELAY_MS = 30 * 1000; // 30 seconds

export const checkTrackingDns: JobProcessor<
  "sending-domains",
  "check-tracking-dns"
> = async (data, jobId) => {
  const { domainId, attempt = 1 } = data;

  logger.info(
    { jobId, domainId, attempt },
    "Checking tracking domain DNS configuration",
  );

  const domain = await prisma.sendingDomain.findUnique({
    where: { id: domainId },
    select: {
      id: true,
      name: true,
      trackingSubDomain: true,
      trackingDomainCnameValue: true,
      trackingDomainVerifiedAt: true,
    },
  });

  if (!domain) {
    logger.warn({ jobId, domainId }, "Domain not found, may have been deleted");
    return;
  }

  // Build the full tracking domain name
  const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;
  const expectedCname = domain.trackingDomainCnameValue;

  logger.debug(
    { jobId, trackingDomain, expectedCname },
    "Resolving CNAME record",
  );

  try {
    // Resolve CNAME records for the tracking domain
    const cnameRecords = await dns.resolveCname(trackingDomain);

    // Check if any CNAME points to our expected target
    const isConfigured = cnameRecords.some(
      (cname) =>
        cname.toLowerCase() === expectedCname.toLowerCase() ||
        cname.toLowerCase().endsWith(`.${expectedCname.toLowerCase()}`),
    );

    if (!isConfigured) {
      logger.info(
        { jobId, trackingDomain, cnameRecords, expectedCname },
        "CNAME found but does not match expected target",
      );

      if (attempt < MAX_ATTEMPTS) {
        await queue("sending-domains").push(
          "check-tracking-dns",
          { domainId, attempt: attempt + 1 },
          { delay: RETRY_DELAY_MS },
        );
        return;
      }

      logger.warn(
        { jobId, domainId, trackingDomain },
        "Max attempts reached, DNS verification failed",
      );
      return;
    }

    // CNAME is correctly configured
    logger.info(
      { jobId, trackingDomain, cnameRecords },
      "CNAME verified successfully",
    );

    // Update the domain record
    await prisma.sendingDomain.update({
      where: { id: domainId },
      data: {
        trackingDomainVerifiedAt: new Date(),
      },
    });

    // Queue SSL certificate issuance
    await queue("sending-domains").push("issue-tracking-ssl", { domainId });

    logger.info(
      { jobId, domainId, trackingDomain },
      "DNS verified, SSL issuance job queued",
    );
  } catch (error) {
    // Handle DNS errors (ENOTFOUND, ENODATA, etc.)
    const dnsError = error as NodeJS.ErrnoException;

    if (dnsError.code === "ENOTFOUND" || dnsError.code === "ENODATA") {
      logger.info(
        { jobId, trackingDomain, error: dnsError.code },
        "No CNAME record found",
      );

      if (attempt < MAX_ATTEMPTS) {
        await queue("sending-domains").push(
          "check-tracking-dns",
          { domainId, attempt: attempt + 1 },
          { delay: RETRY_DELAY_MS },
        );
        return;
      }

      logger.warn(
        { jobId, domainId, trackingDomain },
        "Max attempts reached, no CNAME record found",
      );
      return;
    }

    // Unexpected error
    logger.error(
      { jobId, domainId, trackingDomain, error },
      "Failed to resolve DNS",
    );
    throw error;
  }
};
