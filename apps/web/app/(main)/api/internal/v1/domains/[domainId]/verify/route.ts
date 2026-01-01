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
    withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return verifySendingDomain(session.currentOrganization.id, domainId);
    }),
  );
}
