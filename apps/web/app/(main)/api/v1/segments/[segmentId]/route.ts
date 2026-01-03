/**
 * Individual Segment Management Route (External API)
 *
 * GET    /api/v1/segments/[segmentId] - Get specific segment
 * PUT    /api/v1/segments/[segmentId] - Update specific segment
 * DELETE /api/v1/segments/[segmentId] - Delete specific segment
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import {
  deleteSegment,
  getSegment,
  updateSegment,
} from "@/app/(main)/api/v1/segments/handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

/**
 * GET /api/v1/segments/[segmentId]
 *
 * Get a specific segment
 * Requires API key authentication with read:segments scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getSegment(apiKey.workspaceId, segmentId),
      ["read:segments"],
    ),
  );
}

/**
 * PUT /api/v1/segments/[segmentId]
 *
 * Update a specific segment
 * Requires API key authentication with update:segments scope
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        updateSegment(apiKey.workspaceId, segmentId, request),
      ["update:segments"],
    ),
  );
}

/**
 * DELETE /api/v1/segments/[segmentId]
 *
 * Delete a specific segment
 * Requires API key authentication with delete:segments scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteSegment(apiKey.workspaceId, segmentId),
      ["delete:segments"],
    ),
  );
}
