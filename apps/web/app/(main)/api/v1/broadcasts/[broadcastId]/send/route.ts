/**
 * Send Broadcast Route (External API)
 *
 * POST /api/v1/broadcasts/:broadcastId/send - Schedule broadcast for sending
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { scheduleBroadcast } from "@/app/(main)/api/v1/broadcasts/handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

/**
 * POST /api/v1/broadcasts/:broadcastId/send
 *
 * Schedule a broadcast for sending
 * Requires API key authentication with write:broadcasts scope
 * Performs readiness checks and schedules job 5 minutes before send time
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => scheduleBroadcast(apiKey.workspaceId, broadcastId),
      ["write:broadcasts"],
    ),
  );
}
