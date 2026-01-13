/**
 * Broadcast Sends Route (External API)
 *
 * GET /api/v1/broadcasts/[broadcastId]/sends
 *
 * List all sends for a broadcast with cursor-based pagination.
 * Optionally filter by status.
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { listBroadcastSends } from "../../handler";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => listBroadcastSends(apiKey.workspaceId, broadcastId, request),
      ["read:broadcasts"],
    ),
  );
}
