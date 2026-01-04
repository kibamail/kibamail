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

  logger.info({ jobId, domainId }, "Starting SSL certificate issuance");

  // Fetch the domain
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

  // Verify DNS is configured
  if (!domain.trackingDomainVerifiedAt) {
    logger.warn(
      { jobId, domainId },
      "Tracking domain DNS not verified, skipping SSL",
    );
    return;
  }

  // Check if certificate needs issuance or renewal
  // Let's Encrypt certs are valid for 90 days, we renew after 60 days
  const RENEWAL_THRESHOLD_DAYS = 60;

  if (domain.trackingDomainSslVerifiedAt) {
    const certAgeMs = Date.now() - domain.trackingDomainSslVerifiedAt.getTime();
    const certAgeDays = certAgeMs / (1000 * 60 * 60 * 24);

    if (certAgeDays < RENEWAL_THRESHOLD_DAYS) {
      logger.info(
        { jobId, domainId, certAgeDays: Math.floor(certAgeDays) },
        "SSL certificate still valid, skipping",
      );
      return;
    }

    logger.info(
      { jobId, domainId, certAgeDays: Math.floor(certAgeDays) },
      "SSL certificate due for renewal",
    );
  }

  const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;

  logger.info({ jobId, trackingDomain }, "Issuing certificate for domain");

  // Get the ACME account key from environment
  const accountKey = Buffer.from(env.ACME_ACCOUNT_KEY, "base64");

  const acmeTool = createAcmeTool();

  // Issue the certificate
  try {
    const { certificate, privateKey } = await acmeTool
      .setAccountKey(accountKey)
      .forDomain(trackingDomain)
      .issueCertificate(
        // Challenge create callback
        async (token, keyAuthorization) => {
          logger.debug(
            { jobId, domainId, token: token.slice(0, 8) },
            "Storing ACME challenge",
          );

          await prisma.sendingDomain.update({
            where: { id: domainId },
            data: {
              trackingSslChallengeToken: token,
              trackingSslChallengeAuth: encrypt(keyAuthorization),
            },
          });
        },
        // Challenge remove callback
        async (token) => {
          logger.debug(
            { jobId, domainId, token: token.slice(0, 8) },
            "Clearing ACME challenge",
          );

          await prisma.sendingDomain.update({
            where: { id: domainId },
            data: {
              trackingSslChallengeToken: null,
              trackingSslChallengeAuth: null,
            },
          });
        },
      );

    // Store the certificate (encrypted)
    await prisma.sendingDomain.update({
      where: { id: domainId },
      data: {
        trackingSslCertKey: encrypt(certificate),
        trackingSslCertSecret: encrypt(privateKey.toString("utf-8")),
        trackingDomainSslVerifiedAt: new Date(),
        // Clear challenge data
        trackingSslChallengeToken: null,
        trackingSslChallengeAuth: null,
      },
    });

    logger.info(
      { jobId, domainId, trackingDomain },
      "SSL certificate issued and stored successfully",
    );
  } catch (error) {
    logger.error(
      { jobId, domainId, trackingDomain, error },
      "Failed to issue SSL certificate",
    );

    // Clear any challenge data on failure
    await prisma.sendingDomain.update({
      where: { id: domainId },
      data: {
        trackingSslChallengeToken: null,
        trackingSslChallengeAuth: null,
      },
    });

    throw error;
  }
};
