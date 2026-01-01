/**
 * Broadcasts Management Route (External API)
 *
 * POST   /api/v1/broadcasts - Create new broadcast
 * GET    /api/v1/broadcasts - List broadcasts (paginated)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { createBroadcast, listBroadcasts } from "./handler";

/**
 * POST /api/v1/broadcasts
 *
 * Create a new broadcast
 * Requires API key authentication with write:broadcasts scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createBroadcast(apiKey.workspaceId, request),
      ["write:broadcasts"],
    ),
  );
}

/**
 * GET /api/v1/broadcasts
 *
 * List broadcasts with pagination
 * Requires API key authentication with read:broadcasts scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listBroadcasts(apiKey.workspaceId, request),
      ["read:broadcasts"],
    ),
  );
}
