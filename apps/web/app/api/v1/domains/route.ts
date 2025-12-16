/**
 * Sending Domains Management Route (External API)
 *
 * POST   /api/v1/domains - Create new sending domain
 * GET    /api/v1/domains - List sending domains (paginated)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { createSendingDomain, listSendingDomains } from "./handler";

/**
 * POST /api/v1/domains
 *
 * Create a new sending domain
 * Requires API key authentication with write:domains scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createSendingDomain(apiKey.workspaceId, request),
      ["write:domains"]
    )
  );
}

/**
 * GET /api/v1/domains
 *
 * List sending domains with pagination
 * Requires API key authentication with read:domains scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listSendingDomains(apiKey.workspaceId, request),
      ["read:domains"]
    )
  );
}
