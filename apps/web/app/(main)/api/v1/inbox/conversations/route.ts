/**
 * Inbox Conversations Route (External API)
 *
 * GET    /api/v1/inbox/conversations - List conversations (paginated)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { listConversations } from "../handler";

/**
 * GET /api/v1/inbox/conversations
 *
 * List conversations with pagination
 * Requires API key authentication with read:inbox scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listConversations(apiKey.workspaceId, request),
      ["read:inbox"],
    ),
  );
}
