/**
 * Inbox Domain Validation Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/sending-domains/validate-inbox/[domain]
 *
 * Supported Methods:
 * - POST   Validate if a domain is inbox-enabled and verified
 *
 * This endpoint is called by the MTA (KumoMTA) to determine if it should
 * accept inbound emails for a given domain.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { queueLogger } from "@/lib/queue";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";

const logger = queueLogger.child({ module: "validate-inbox-domain" });

/**
 * POST /api/internal/v1/sending-domains/validate-inbox/[domain]
 *
 * Validate if a domain is inbox-enabled and has verified MX records.
 *
 * Response:
 * {
 *   "valid": true,
 *   "workspace_id": "workspace_123",
 *   "sending_domain_id": "domain_456"
 * }
 *
 * Or if invalid:
 * {
 *   "valid": false
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  return withErrorHandling(request, () =>
    withServiceAuth(request, async () => {
      const { domain: domainName } = await params;

      logger.debug({ domain: domainName }, "Validating inbox domain");

      // Find sending domain with inbox enabled and MX verified
      const domain = await prisma.sendingDomain.findFirst({
        where: {
          name: domainName,
          inboxEnabled: true,
          inboxMxVerifiedAt: { not: null },
        },
        select: {
          id: true,
          workspaceId: true,
          name: true,
        },
      });

      if (!domain) {
        logger.debug(
          { domain: domainName },
          "Inbox domain not found or not enabled",
        );
        return NextResponse.json({ valid: false });
      }

      logger.debug(
        { domain: domainName, workspaceId: domain.workspaceId },
        "Inbox domain validated",
      );

      return NextResponse.json({
        valid: true,
        workspace_id: domain.workspaceId,
        sending_domain_id: domain.id,
      });
    }),
  );
}
