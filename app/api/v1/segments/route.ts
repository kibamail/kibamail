/**
 * Segments Collection Route (External API)
 *
 * POST   /api/v1/segments - Create new segment
 * GET    /api/v1/segments - List segments with pagination
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { createSegment, listSegments } from "./handler";

/**
 * POST /api/v1/segments
 *
 * Create a new segment
 * Requires API key authentication with write:segments scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createSegment(apiKey.workspaceId, request),
      ["write:segments"]
    )
  );
}

/**
 * GET /api/v1/segments
 *
 * List segments with cursor-based pagination
 * Requires API key authentication with read:segments scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listSegments(apiKey.workspaceId, request),
      ["read:segments"]
    )
  );
}
