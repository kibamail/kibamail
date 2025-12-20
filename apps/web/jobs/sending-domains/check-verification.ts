import { prisma } from "@/lib/db";
import { queue, queueLogger } from "@/lib/queue";
import type { JobProcessor } from "@/lib/queue";
import { verifyDnsRecords } from "@/lib/sending-domains/dns";

const logger = queueLogger.child({ job: "check-verification" });

const MAX_ATTEMPTS = 8;
const CHECK_DELAY_MS = 5 * 60 * 1000;

function isDomainFullyVerified(domain: {
  dkimVerifiedAt: Date | null;
  returnPathDomainVerifiedAt: Date | null;
  trackingDomainVerifiedAt: Date | null;
  dmarcVerifiedAt: Date | null;
}): boolean {
  return (
    domain.dkimVerifiedAt !== null &&
    domain.returnPathDomainVerifiedAt !== null &&
    domain.trackingDomainVerifiedAt !== null &&
    domain.dmarcVerifiedAt !== null
  );
}

export const checkVerification: JobProcessor<
  "sending-domains",
  "check-verification"
> = async (data, jobId) => {
  const { domainId, attempt } = data;

  logger.info(
    { jobId, domainId, attempt, maxAttempts: MAX_ATTEMPTS },
    "Starting domain verification check",
  );

  const domain = await prisma.sendingDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    logger.warn({ jobId, domainId }, "Domain not found, stopping checks");
    return;
  }

  if (isDomainFullyVerified(domain)) {
    logger.info(
      { jobId, domainId },
      "Domain already fully verified, no action needed",
    );
    return;
  }

  const verificationResult = await verifyDnsRecords(
    domain.name,
    domain.dkimSubDomain,
    domain.dkimPublicKey,
    domain.returnPathSubDomain,
    domain.trackingSubDomain,
    domain.returnPathDomainCnameValue,
    domain.trackingDomainCnameValue,
    domain.dmarcReportingCode,
  );

  const now = new Date();
  const updateData: {
    recordsLastVerifiedAt: Date;
    dkimVerifiedAt?: Date;
    returnPathDomainVerifiedAt?: Date;
    trackingDomainVerifiedAt?: Date;
    dmarcVerifiedAt?: Date;
  } = {
    recordsLastVerifiedAt: now,
  };

  if (verificationResult.dkim.configured && !domain.dkimVerifiedAt) {
    updateData.dkimVerifiedAt = now;
    logger.info({ jobId, domainId }, "DKIM record verified");
  }

  if (
    verificationResult.returnPath.configured &&
    !domain.returnPathDomainVerifiedAt
  ) {
    updateData.returnPathDomainVerifiedAt = now;
    logger.info({ jobId, domainId }, "Return path record verified");
  }

  if (
    verificationResult.tracking.configured &&
    !domain.trackingDomainVerifiedAt
  ) {
    updateData.trackingDomainVerifiedAt = now;
    logger.info({ jobId, domainId }, "Tracking record verified");
  }

  if (verificationResult.dmarc.configured && !domain.dmarcVerifiedAt) {
    updateData.dmarcVerifiedAt = now;
    logger.info({ jobId, domainId }, "DMARC record verified");
  }

  const updatedDomain = await prisma.sendingDomain.update({
    where: { id: domainId },
    data: updateData,
  });

  if (isDomainFullyVerified(updatedDomain)) {
    logger.info(
      { jobId, domainId, attempt },
      "Domain is now fully verified, stopping checks",
    );
    return;
  }

  if (attempt >= MAX_ATTEMPTS) {
    logger.info(
      { jobId, domainId, attempt, maxAttempts: MAX_ATTEMPTS },
      "Max verification attempts reached, stopping checks",
    );
    return;
  }

  const nextAttempt = attempt + 1;
  logger.info(
    { jobId, domainId, attempt, nextAttempt, delayMs: CHECK_DELAY_MS },
    "Domain not fully verified, scheduling next check",
  );

  await queue("sending-domains").push(
    "check-verification",
    { domainId, attempt: nextAttempt },
    { delay: CHECK_DELAY_MS },
  );
};
