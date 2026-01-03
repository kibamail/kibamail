/**
 * Individual Broadcast Management Route (External API)
 *
 * GET    /api/v1/broadcasts/:broadcastId - Get broadcast details
 * PUT    /api/v1/broadcasts/:broadcastId - Update broadcast
 * DELETE /api/v1/broadcasts/:broadcastId - Delete broadcast
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import {
  deleteBroadcast,
  getBroadcast,
  updateBroadcast,
} from "@/app/(main)/api/v1/broadcasts/handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

/**
 * GET /api/v1/broadcasts/:broadcastId
 *
 * Get a specific broadcast by ID
 * Requires API key authentication with read:broadcasts scope
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getBroadcast(apiKey.workspaceId, broadcastId),
      ["read:broadcasts"],
    ),
  );
}

/**
 * PUT /api/v1/broadcasts/:broadcastId
 *
 * Update a specific broadcast by ID
 * Requires API key authentication with write:broadcasts scope
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        updateBroadcast(apiKey.workspaceId, broadcastId, request),
      ["write:broadcasts"],
    ),
  );
}

/**
 * DELETE /api/v1/broadcasts/:broadcastId
 *
 * Delete a specific broadcast by ID
 * Requires API key authentication with write:broadcasts scope
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteBroadcast(apiKey.workspaceId, broadcastId),
      ["write:broadcasts"],
    ),
  );
}
