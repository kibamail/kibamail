/**
 * Sending Domains Endpoints - Business Logic (External API)
 *
 * Handlers for managing sending domains via external API
 * Uses API key authentication (withApiSession)
 * Workspace is deduced from the API key, not from URL parameters
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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
import {
  DNS_CONFIG,
  generateDmarcReportingCode,
  getDnsRecords,
  verifyDnsRecords,
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
  dmarcReportingCode: string;
  dmarcVerifiedAt: Date | null;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  createdAt: Date;
}) {
  const dnsRecords = getDnsRecords(
    domain.name,
    domain.dkimSubDomain,
    domain.dkimPublicKey,
    domain.returnPathSubDomain,
    domain.trackingSubDomain,
    domain.dmarcReportingCode,
  );

  return {
    id: domain.id,
    name: domain.name,
    dkimVerified: domain.dkimVerifiedAt !== null,
    returnPathVerified: domain.returnPathDomainVerifiedAt !== null,
    trackingVerified: domain.trackingDomainVerifiedAt !== null,
    dmarcVerified: domain.dmarcVerifiedAt !== null,
    openTrackingEnabled: domain.openTrackingEnabled,
    clickTrackingEnabled: domain.clickTrackingEnabled,
    dnsRecords,
    createdAt: domain.createdAt.toISOString(),
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

  // Create the sending domain
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
      dmarcReportingCode,
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

  // Verify DNS records
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

  // Update verification timestamps
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
  }

  if (
    verificationResult.returnPath.configured &&
    !domain.returnPathDomainVerifiedAt
  ) {
    updateData.returnPathDomainVerifiedAt = now;
  }

  if (
    verificationResult.tracking.configured &&
    !domain.trackingDomainVerifiedAt
  ) {
    updateData.trackingDomainVerifiedAt = now;
  }

  if (verificationResult.dmarc.configured && !domain.dmarcVerifiedAt) {
    updateData.dmarcVerifiedAt = now;
  }

  const updatedDomain = await prisma.sendingDomain.update({
    where: { id: domainId },
    data: updateData,
  });

  // Return verification result along with updated domain
  return responseOk(
    {
      ...formatSendingDomain(updatedDomain),
      verification: verificationResult,
    },
    "sending_domain",
  );
}
