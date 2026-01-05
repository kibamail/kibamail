/**
 * Issue Tracking Domain SSL Certificate Job
 *
 * Obtains an SSL certificate from Let's Encrypt for a customer's
 * tracking domain using the ACME HTTP-01 challenge.
 *
 * Flow:
 * 1. Load ACME account key from environment
 * 2. Create CSR for the tracking domain
 * 3. Store challenge token/authorization in database
 * 4. Let's Encrypt validates via HTTP-01 challenge
 * 5. Store issued certificate (encrypted) in database
 */

import { env } from "@/env/schema";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { createAcmeTool } from "@/lib/ssl/acme";

const logger = queueLogger.child({ job: "issue-tracking-ssl" });

export const issueTrackingSsl: JobProcessor<
  "sending-domains",
  "issue-tracking-ssl"
> = async (data, jobId) => {
  const { domainId } = data;
  const startTime = Date.now();

  logger.info(
    { jobId, domainId },
    "=== SSL CERTIFICATE ISSUANCE JOB STARTED ===",
  );

  // Fetch the domain
  logger.info({ jobId, domainId }, "Fetching domain details from database");
  const domain = await prisma.sendingDomain.findUnique({
    where: { id: domainId },
    select: {
      id: true,
      name: true,
      trackingSubDomain: true,
      trackingDomainVerifiedAt: true,
      trackingDomainSslVerifiedAt: true,
    },
  });

  if (!domain) {
    logger.warn({ jobId, domainId }, "Domain not found, may have been deleted");
    return;
  }

  const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;

  logger.info(
    {
      jobId,
      domainId,
      domainName: domain.name,
      trackingDomain,
      trackingDomainVerifiedAt: domain.trackingDomainVerifiedAt?.toISOString(),
      trackingDomainSslVerifiedAt:
        domain.trackingDomainSslVerifiedAt?.toISOString(),
    },
    "Domain details retrieved",
  );

  // Verify DNS is configured
  if (!domain.trackingDomainVerifiedAt) {
    logger.warn(
      { jobId, domainId, trackingDomain },
      "Tracking domain DNS not verified - SSL issuance requires DNS verification first. Skipping.",
    );
    return;
  }

  // Check if certificate needs issuance or renewal
  // Let's Encrypt certs are valid for 90 days, we renew after 60 days
  const RENEWAL_THRESHOLD_DAYS = 60;

  if (domain.trackingDomainSslVerifiedAt) {
    const certAgeMs = Date.now() - domain.trackingDomainSslVerifiedAt.getTime();
    const certAgeDays = certAgeMs / (1000 * 60 * 60 * 24);
    const daysUntilExpiry = 90 - certAgeDays;

    if (certAgeDays < RENEWAL_THRESHOLD_DAYS) {
      logger.info(
        {
          jobId,
          domainId,
          trackingDomain,
          certAgeDays: Math.floor(certAgeDays),
          daysUntilExpiry: Math.floor(daysUntilExpiry),
          renewalThreshold: RENEWAL_THRESHOLD_DAYS,
        },
        "SSL certificate still valid (not yet due for renewal). Skipping.",
      );
      return;
    }

    logger.info(
      {
        jobId,
        domainId,
        trackingDomain,
        certAgeDays: Math.floor(certAgeDays),
        daysUntilExpiry: Math.floor(daysUntilExpiry),
        renewalThreshold: RENEWAL_THRESHOLD_DAYS,
      },
      "SSL certificate due for renewal - proceeding with certificate issuance",
    );
  } else {
    logger.info(
      { jobId, domainId, trackingDomain },
      "No existing SSL certificate found - proceeding with initial certificate issuance",
    );
  }

  logger.info(
    { jobId, domainId, trackingDomain },
    "Initiating Let's Encrypt ACME certificate issuance",
  );

  // Mark SSL issuance as in progress
  await prisma.sendingDomain.update({
    where: { id: domainId },
    data: {
      sslIssuanceStatus: "in_progress",
      sslIssuanceStartedAt: new Date(),
      sslIssuanceError: null,
    },
  });

  // Get the ACME account key from environment
  logger.debug({ jobId, domainId }, "Loading ACME account key from environment");
  const accountKey = Buffer.from(env.ACME_ACCOUNT_KEY, "base64");

  const acmeTool = createAcmeTool();

  // Issue the certificate
  try {
    logger.info(
      { jobId, domainId, trackingDomain },
      "Starting ACME certificate issuance via Let's Encrypt",
    );

    const { certificate, privateKey } = await acmeTool
      .setAccountKey(accountKey)
      .forDomain(trackingDomain)
      .issueCertificate(
        // Challenge create callback
        async (token, keyAuthorization) => {
          logger.info(
            { jobId, domainId, trackingDomain, tokenPrefix: token.slice(0, 8) },
            "Storing ACME HTTP-01 challenge in database",
          );

          await prisma.sendingDomain.update({
            where: { id: domainId },
            data: {
              trackingSslChallengeToken: token,
              trackingSslChallengeAuth: encrypt(keyAuthorization),
            },
          });

          logger.info(
            {
              jobId,
              domainId,
              trackingDomain,
              tokenPrefix: token.slice(0, 8),
              challengeUrl: `http://${trackingDomain}/.well-known/acme-challenge/${token}`,
            },
            "Challenge stored - Let's Encrypt will now validate via HTTP-01",
          );
        },
        // Challenge remove callback
        async (token) => {
          logger.info(
            { jobId, domainId, trackingDomain, tokenPrefix: token.slice(0, 8) },
            "Let's Encrypt validation complete - clearing challenge from database",
          );

          await prisma.sendingDomain.update({
            where: { id: domainId },
            data: {
              trackingSslChallengeToken: null,
              trackingSslChallengeAuth: null,
            },
          });

          logger.debug(
            { jobId, domainId, tokenPrefix: token.slice(0, 8) },
            "Challenge cleared from database",
          );
        },
      );

    // Store the certificate (encrypted)
    logger.info(
      { jobId, domainId, trackingDomain },
      "Certificate received from Let's Encrypt - storing encrypted certificate in database",
    );

    await prisma.sendingDomain.update({
      where: { id: domainId },
      data: {
        trackingSslCertKey: encrypt(certificate),
        trackingSslCertSecret: encrypt(privateKey.toString("utf-8")),
        trackingDomainSslVerifiedAt: new Date(),
        // Mark SSL issuance as completed
        sslIssuanceStatus: "completed",
        // Clear challenge data
        trackingSslChallengeToken: null,
        trackingSslChallengeAuth: null,
      },
    });

    const durationMs = Date.now() - startTime;
    logger.info(
      {
        jobId,
        domainId,
        trackingDomain,
        durationMs,
        durationSec: Math.round(durationMs / 1000),
        certificateLength: certificate.length,
      },
      "=== SSL CERTIFICATE ISSUANCE JOB COMPLETED SUCCESSFULLY ===",
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        jobId,
        domainId,
        trackingDomain,
        durationMs,
        error: errorMessage,
        stack: errorStack,
      },
      "=== SSL CERTIFICATE ISSUANCE JOB FAILED ===",
    );

    // Mark SSL issuance as failed and clear challenge data
    logger.info(
      { jobId, domainId },
      "Marking SSL issuance as failed and cleaning up challenge data",
    );

    await prisma.sendingDomain.update({
      where: { id: domainId },
      data: {
        sslIssuanceStatus: "failed",
        sslIssuanceError: errorMessage,
        trackingSslChallengeToken: null,
        trackingSslChallengeAuth: null,
      },
    });

    throw error;
  }
};
