/**
 * Sending Domain DNS Verification Route (External API)
 *
 * POST   /api/v1/domains/[domainId]/verify - Verify DNS configuration
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";

import { withApiSession, withErrorHandling } from "@/lib/api/requests";

import { verifySendingDomain } from "../../handler";

/**
 * POST /api/v1/domains/[domainId]/verify
 *
 * Verify DNS configuration for a sending domain
 * Requires API key authentication with update:domains scope
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> },
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => verifySendingDomain(apiKey.workspaceId, domainId),
      ["update:domains"],
    ),
  );
}
