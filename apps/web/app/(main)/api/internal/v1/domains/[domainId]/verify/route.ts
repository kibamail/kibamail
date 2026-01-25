/**
 * Sending Domain DNS Verification Route (Internal API)
 *
 * POST   /api/internal/v1/domains/[domainId]/verify - Verify DNS configuration
 *
 * Authentication: Session-based
 * Uses session-based authentication and gets workspaceId from session
 */

import type { NextRequest } from "next/server";

import { verifySendingDomain } from "@/app/(main)/api/v1/domains/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * POST /api/internal/v1/domains/[domainId]/verify
 *
 * Verify DNS configuration for a sending domain
 * Uses session-based authentication and gets workspaceId from session
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
      const response = await verifySendingDomain(
        session.currentOrganization.id,
        domainId,
      );

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: session.user.sub,
        event: "domain_verified",
        properties: {
          workspace_id: session.currentOrganization.id,
          domain_id: domainId,
        },
      });

      return response;
    }),
  );
}
