/**
 * Sending Domains Endpoints - Business Logic (External API)
 *
 * Handlers for managing sending domains via external API
 * Uses API key authentication (withApiSession)
 * Workspace is deduced from the API key, not from URL parameters
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_WARMUP_TIER } from "@/config/warmup";
import { env } from "@/env/schema";
import { ErrorCode } from "@/lib/api/error-codes";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import {
  generateDkimKeyPair,
  generateDkimSubdomain,
} from "@/lib/sending-domains/dkim";
import { generateDmarcReportingCode } from "@/lib/sending-domains/dmarc";
import {
  DNS_CONFIG,
  getDnsRecords,
  verifyDnsRecords,
  verifyInboxMxRecord,
} from "@/lib/sending-domains/dns";
import { createSendingDomainSchema, updateSendingDomainSchema } from "./schema";

/**
 * Format a sending domain for API response
 */
function formatSendingDomain(domain: {
  id: string;
  name: string;
  dkimSubDomain: string;
  dkimPublicKey: string;
  dkimVerifiedAt: Date | null;
  returnPathSubDomain: string;
  returnPathDomainCnameValue: string;
  returnPathDomainVerifiedAt: Date | null;
  trackingSubDomain: string;
  trackingDomainCnameValue: string;
  trackingDomainVerifiedAt: Date | null;
  dmarcEnabled: boolean;
  dmarcReportingCode: string;
  dmarcVerifiedAt: Date | null;
  inboxEnabled: boolean;
  inboxMxVerifiedAt: Date | null;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  sslIssuanceStatus: string | null;
  sslIssuanceError: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const dnsRecords = getDnsRecords(
    domain.name,
    domain.dkimSubDomain,
    domain.dkimPublicKey,
    domain.returnPathSubDomain,
    domain.trackingSubDomain,
    domain.dmarcEnabled ? domain.dmarcReportingCode : null,
  );

  return {
    id: domain.id,
    name: domain.name,
    dkimVerified: domain.dkimVerifiedAt !== null,
    returnPathVerified: domain.returnPathDomainVerifiedAt !== null,
    trackingVerified: domain.trackingDomainVerifiedAt !== null,
    dmarcEnabled: domain.dmarcEnabled,
    dmarcVerified: domain.dmarcVerifiedAt !== null,
    inboxEnabled: domain.inboxEnabled,
    inboxMxVerified: domain.inboxMxVerifiedAt !== null,
    openTrackingEnabled: domain.openTrackingEnabled,
    clickTrackingEnabled: domain.clickTrackingEnabled,
    dnsRecords,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
    sslStatus: domain.sslIssuanceStatus as
      | "pending"
      | "in_progress"
      | "completed"
      | "failed"
      | null,
    sslError: domain.sslIssuanceError,
  };
}

/**
 * POST /api/v1/domains
 *
 * Create a new sending domain for the workspace.
 * Generates DKIM key pair and DNS configuration.
 */
export async function createSendingDomain(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(createSendingDomainSchema, request);

  // Check if domain already exists for this workspace
  const existingDomain = await prisma.sendingDomain.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: data.name,
      },
    },
  });

  if (existingDomain) {
    throw new ConflictError(
      `Domain "${data.name}" already exists in this workspace`,
      ErrorCode.SENDING_DOMAIN_ALREADY_EXISTS,
    );
  }

  // Generate DKIM key pair and DMARC reporting code
  const dkimKeyPair = generateDkimKeyPair(env.APP_KEY);
  const dkimSubDomain = generateDkimSubdomain();
  const dmarcReportingCode = generateDmarcReportingCode();

  // Create the sending domain with warmup limits from tier 1
  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId,
      name: data.name,
      dkimSubDomain,
      dkimPublicKey: dkimKeyPair.publicKey,
      dkimPrivateKey: dkimKeyPair.encrypted.privateKey,
      returnPathSubDomain: DNS_CONFIG.bounceSubdomain,
      returnPathDomainCnameValue: DNS_CONFIG.bounceHost,
      trackingSubDomain: DNS_CONFIG.trackingSubdomain,
      trackingDomainCnameValue: DNS_CONFIG.trackingHost,
      dmarcEnabled: data.dmarcEnabled ?? false,
      dmarcReportingCode,
      maxSendPerDay: DEFAULT_WARMUP_TIER.dailyLimit,
      maxSendPerHour: DEFAULT_WARMUP_TIER.hourlyLimit,
    },
  });

  // Schedule verification check job to run in 5 minutes
  await queue("sending-domains").push(
    "check-verification",
    { domainId: domain.id, attempt: 1 },
    { delay: 5 * 60 * 1000 },
  );

  return responseCreated(formatSendingDomain(domain), "sending_domain");
}

/**
 * GET /api/v1/domains
 *
 * List sending domains for the workspace with cursor-based pagination.
 */
export async function listSendingDomains(
  workspaceId: string,
  request: NextRequest,
) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: { workspaceId },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const domains = after
    ? await prisma.sendingDomain.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.sendingDomain.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.sendingDomain.findMany(baseQuery);

  const hasMore = domains.length > limit;
  const items = hasMore ? domains.slice(0, -1) : domains;

  if (before) {
    items.reverse();
  }

  const formattedDomains = items.map(formatSendingDomain);

  const paginatedResponse = createCursorPaginatedResponse(
    formattedDomains,
    hasMore,
    "sending_domain_list",
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/domains/[domainId]
 *
 * Get a specific sending domain by ID.
 */
export async function getSendingDomain(workspaceId: string, domainId: string) {
  const domain = await prisma.sendingDomain.findFirst({
    where: {
      id: domainId,
      workspaceId,
    },
  });

  if (!domain) {
    throw new NotFoundError(
      "Sending domain not found",
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  return responseOk(formatSendingDomain(domain), "sending_domain");
}

/**
 * PUT /api/v1/domains/[domainId]
 *
 * Update a specific sending domain by ID.
 * Only tracking settings can be updated.
 */
export async function updateSendingDomain(
  workspaceId: string,
  domainId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateSendingDomainSchema, request);

  // Check if domain exists
  const existingDomain = await prisma.sendingDomain.findFirst({
    where: {
      id: domainId,
      workspaceId,
    },
  });

  if (!existingDomain) {
    throw new NotFoundError(
      "Sending domain not found",
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  const updatedDomain = await prisma.sendingDomain.update({
    where: { id: domainId },
    data: {
      ...(data.openTrackingEnabled !== undefined && {
        openTrackingEnabled: data.openTrackingEnabled,
      }),
      ...(data.clickTrackingEnabled !== undefined && {
        clickTrackingEnabled: data.clickTrackingEnabled,
      }),
      ...(data.dmarcEnabled !== undefined && {
        dmarcEnabled: data.dmarcEnabled,
      }),
      ...(data.inboxEnabled !== undefined && {
        inboxEnabled: data.inboxEnabled,
      }),
    },
  });

  return responseOk(formatSendingDomain(updatedDomain), "sending_domain");
}

/**
 * DELETE /api/v1/domains/[domainId]
 *
 * Delete a specific sending domain by ID.
 */
export async function deleteSendingDomain(
  workspaceId: string,
  domainId: string,
) {
  // Check if domain exists
  const existingDomain = await prisma.sendingDomain.findFirst({
    where: {
      id: domainId,
      workspaceId,
    },
  });

  if (!existingDomain) {
    throw new NotFoundError(
      "Sending domain not found",
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  const deletedDomain = await prisma.sendingDomain.delete({
    where: { id: domainId },
  });

  return responseOk(
    {
      id: deletedDomain.id,
    },
    "sending_domain",
  );
}

/**
 * POST /api/v1/domains/[domainId]/verify
 *
 * Verify DNS configuration for a sending domain.
 * Checks DKIM, return path, and tracking DNS records.
 */
export async function verifySendingDomain(
  workspaceId: string,
  domainId: string,
) {
  const domain = await prisma.sendingDomain.findFirst({
    where: {
      id: domainId,
      workspaceId,
    },
  });

  if (!domain) {
    throw new NotFoundError(
      "Sending domain not found",
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  // Verify DNS records (including MX for inbox)
  const [verificationResult, mxVerificationResult] = await Promise.all([
    verifyDnsRecords(
      domain.name,
      domain.dkimSubDomain,
      domain.dkimPublicKey,
      domain.returnPathSubDomain,
      domain.trackingSubDomain,
      domain.returnPathDomainCnameValue,
      domain.trackingDomainCnameValue,
      domain.dmarcReportingCode,
    ),
    verifyInboxMxRecord(domain.name),
  ]);

  // Update verification timestamps
  const now = new Date();
  const updateData: {
    recordsLastVerifiedAt: Date;
    dkimVerifiedAt?: Date;
    returnPathDomainVerifiedAt?: Date;
    trackingDomainVerifiedAt?: Date;
    dmarcVerifiedAt?: Date;
    inboxMxVerifiedAt?: Date;
  } = {
    recordsLastVerifiedAt: now,
  };

  if (verificationResult.dkim.configured && !domain.dkimVerifiedAt) {
    updateData.dkimVerifiedAt = now;
  }

  if (
    verificationResult.returnPath.configured &&
    !domain.returnPathDomainVerifiedAt
  ) {
    updateData.returnPathDomainVerifiedAt = now;
  }

  // Track if tracking domain is being newly verified for SSL issuance
  const trackingNewlyVerified =
    verificationResult.tracking.configured && !domain.trackingDomainVerifiedAt;

  if (trackingNewlyVerified) {
    updateData.trackingDomainVerifiedAt = now;
  }

  if (domain.dmarcEnabled && verificationResult.dmarc.configured && !domain.dmarcVerifiedAt) {
    updateData.dmarcVerifiedAt = now;
  }

  // Verify MX record for inbox
  if (domain.inboxEnabled && mxVerificationResult.configured && !domain.inboxMxVerifiedAt) {
    updateData.inboxMxVerifiedAt = now;
  }

  // Determine if we should trigger SSL issuance:
  // 1. Tracking domain is newly verified, OR
  // 2. Tracking domain was already verified but SSL issuance hasn't started/completed
  const trackingIsVerified =
    trackingNewlyVerified || domain.trackingDomainVerifiedAt !== null;
  const sslNotInProgress =
    domain.sslIssuanceStatus !== "in_progress" &&
    domain.sslIssuanceStatus !== "completed";
  const shouldTriggerSsl = trackingIsVerified && sslNotInProgress;

  // Queue SSL certificate issuance if needed
  if (shouldTriggerSsl) {
    // Set SSL issuance status to pending before queuing the job
    (updateData as Record<string, unknown>).sslIssuanceStatus = "pending";
  }

  const updatedDomain = await prisma.sendingDomain.update({
    where: { id: domainId },
    data: updateData,
  });

  if (shouldTriggerSsl) {
    await queue("sending-domains").push("issue-tracking-ssl", { domainId });
  }

  // Return verification result along with updated domain
  return responseOk(
    {
      ...formatSendingDomain(updatedDomain),
      verification: {
        ...verificationResult,
        mx: mxVerificationResult,
      },
    },
    "sending_domain",
  );
}
