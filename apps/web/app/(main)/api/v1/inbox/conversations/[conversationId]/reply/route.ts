/**
 * Conversation Reply Route (External API)
 *
 * POST   /api/v1/inbox/conversations/:id/reply - Send a reply
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { sendReply } from "../../../handler";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * POST /api/v1/inbox/conversations/:id/reply
 *
 * Send a reply to a conversation
 * Requires API key authentication with write:inbox scope
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { conversationId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        sendReply(apiKey.workspaceId, conversationId, request),
      ["write:inbox"],
    ),
  );
}
