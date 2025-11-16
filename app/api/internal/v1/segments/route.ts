/**
 * Segments Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/segments
 *
 * Supported Methods:
 * - POST   Create a new segment
 * - GET    List all segments for workspace
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createSegment, listSegments } from "@/app/api/v1/segments/handler";

/**
 * POST /api/internal/v1/segments
 *
 * Create a new segment
 * Requires: manage:segments permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request, 
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return createSegment(session.currentOrganization.id, request);
      },
      ["manage:segments"]
    )
  );
}

/**
 * GET /api/internal/v1/segments
 *
 * List all segments for workspace
 * Requires: read:segments permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return listSegments(session.currentOrganization.id, request);
      },
      ["read:segments"]
    )
  );
}
