/**
 * Single Conversation Route (External API)
 *
 * GET    /api/v1/inbox/conversations/:id - Get conversation with messages
 * PATCH  /api/v1/inbox/conversations/:id - Update conversation status
 * POST   /api/v1/inbox/conversations/:id - Mark conversation as read
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { getConversation, markAsRead, updateConversation } from "../../handler";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * GET /api/v1/inbox/conversations/:id
 *
 * Get a single conversation with all messages
 * Requires API key authentication with read:inbox scope
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { conversationId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getConversation(apiKey.workspaceId, conversationId),
      ["read:inbox"],
    ),
  );
}

/**
 * PATCH /api/v1/inbox/conversations/:id
 *
 * Update conversation status (open, closed, archived)
 * Requires API key authentication with write:inbox scope
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { conversationId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        updateConversation(apiKey.workspaceId, conversationId, request),
      ["write:inbox"],
    ),
  );
}

/**
 * POST /api/v1/inbox/conversations/:id
 *
 * Mark all messages in conversation as read
 * Requires API key authentication with write:inbox scope
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { conversationId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => markAsRead(apiKey.workspaceId, conversationId),
      ["write:inbox"],
    ),
  );
}
