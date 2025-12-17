/**
 * Send Broadcast Route (External API)
 *
 * POST /api/v1/broadcasts/:broadcastId/send - Schedule broadcast for sending
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { sendBroadcast } from "../../handler";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

/**
 * POST /api/v1/broadcasts/:broadcastId/send
 *
 * Schedule a broadcast for sending
 * Requires API key authentication with write:broadcasts scope
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        sendBroadcast(apiKey.workspaceId, broadcastId, request),
      ["write:broadcasts"],
    ),
  );
}
