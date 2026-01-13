/**
 * Broadcast Stats Route (External API)
 *
 * GET /api/v1/broadcasts/[broadcastId]/stats
 *
 * Get aggregate statistics for a broadcast including recipient counts,
 * engagement metrics, and deliverability rates.
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { getBroadcastStats } from "../../handler";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getBroadcastStats(apiKey.workspaceId, broadcastId),
      ["read:broadcasts"],
    ),
  );
}
