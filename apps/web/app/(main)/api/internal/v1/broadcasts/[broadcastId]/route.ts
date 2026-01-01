/**
 * Individual Broadcast Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/broadcasts/[broadcastId]
 *
 * Supported Methods:
 * - GET    Get a specific broadcast
 * - PUT    Update a specific broadcast
 * - DELETE Delete a specific broadcast
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";

import {
  deleteBroadcast,
  getBroadcast,
  updateBroadcast,
} from "@/app/(main)/api/v1/broadcasts/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

/**
 * GET /api/internal/v1/broadcasts/[broadcastId]
 *
 * Get a specific broadcast by ID
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return getBroadcast(session.currentOrganization.id, broadcastId);
    }),
  );
}

/**
 * PUT /api/internal/v1/broadcasts/[broadcastId]
 *
 * Update a specific broadcast by ID
 * Uses session-based authentication and gets workspaceId from session
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return updateBroadcast(
        session.currentOrganization.id,
        broadcastId,
        request,
      );
    }),
  );
}

/**
 * DELETE /api/internal/v1/broadcasts/[broadcastId]
 *
 * Delete a specific broadcast by ID
 * Uses session-based authentication and gets workspaceId from session
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return deleteBroadcast(session.currentOrganization.id, broadcastId);
    }),
  );
}
