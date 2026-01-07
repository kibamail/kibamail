/**
 * Inbox Stats Route (External API)
 *
 * GET    /api/v1/inbox/stats - Get inbox statistics
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { getStats } from "../handler";

/**
 * GET /api/v1/inbox/stats
 *
 * Get inbox statistics (unread counts, etc.)
 * Requires API key authentication with read:inbox scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getStats(apiKey.workspaceId),
      ["read:inbox"],
    ),
  );
}
