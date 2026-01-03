/**
 * Individual Segment Management Route (Internal API)
 *
 * GET    /api/internal/v1/segments/[segmentId] - Get specific segment
 * PUT    /api/internal/v1/segments/[segmentId] - Update specific segment
 * DELETE /api/internal/v1/segments/[segmentId] - Delete specific segment
 *
 * Uses session-based authentication and reuses external API handlers
 */

import type { NextRequest } from "next/server";
import {
  deleteSegment,
  getSegment,
  updateSegment,
} from "@/app/(main)/api/v1/segments/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * GET /api/internal/v1/segments/[segmentId]
 *
 * Get a specific segment
 * Requires: read:segments permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getSegment(session.currentOrganization.id, segmentId);
      },
      ["read:segments"],
    ),
  );
}

/**
 * PUT /api/internal/v1/segments/[segmentId]
 *
 * Update a specific segment
 * Requires: manage:segments permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateSegment(
          session.currentOrganization.id,
          segmentId,
          request,
        );
      },
      ["manage:segments"],
    ),
  );
}

/**
 * DELETE /api/internal/v1/segments/[segmentId]
 *
 * Delete a specific segment
 * Requires: manage:segments permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteSegment(session.currentOrganization.id, segmentId);
      },
      ["manage:segments"],
    ),
  );
}
