/**
 * Send Broadcast Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/broadcasts/[broadcastId]/send
 *
 * Supported Methods:
 * - POST   Schedule broadcast for sending
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";

import { sendBroadcast } from "@/app/api/v1/broadcasts/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

/**
 * POST /api/internal/v1/broadcasts/[broadcastId]/send
 *
 * Schedule a broadcast for sending
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return sendBroadcast(
        session.currentOrganization.id,
        broadcastId,
        request,
      );
    }),
  );
}
