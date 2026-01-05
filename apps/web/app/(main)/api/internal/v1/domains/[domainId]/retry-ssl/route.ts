/**
 * Retry SSL Certificate Issuance Endpoint (Internal API)
 *
 * POST /api/internal/v1/domains/[domainId]/retry-ssl
 *
 * Retries SSL certificate issuance for a domain's tracking subdomain.
 * Only allowed when tracking domain DNS is verified.
 */

import type { NextRequest } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import {
  DNS_CONFIG,
  getDnsRecords,
} from "@/lib/sending-domains/dns";

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
  sslIssuanceStatus: string | null;
  sslIssuanceError: string | null;
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
 * POST /api/internal/v1/domains/[domainId]/retry-ssl
 *
 * Retry SSL certificate issuance for a domain
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> },
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      // Fetch the domain
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

      // Verify tracking domain DNS is verified
      if (!domain.trackingDomainVerifiedAt) {
        throw new BadRequestError(
          "Tracking domain DNS must be verified before SSL certificate can be issued",
          ErrorCode.VALIDATION_FAILED,
        );
      }

      // Don't allow retry if already in progress
      if (domain.sslIssuanceStatus === "in_progress") {
        throw new BadRequestError(
          "SSL certificate issuance is already in progress",
          ErrorCode.VALIDATION_FAILED,
        );
      }

      // Reset status to pending and queue the job
      const updatedDomain = await prisma.sendingDomain.update({
        where: { id: domainId },
        data: {
          sslIssuanceStatus: "pending",
          sslIssuanceError: null,
        },
      });

      // Queue the SSL issuance job
      await queue("sending-domains").push("issue-tracking-ssl", { domainId });

      return responseOk(formatSendingDomain(updatedDomain), "sending_domain");
    }),
  );
}
