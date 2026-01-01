/**
 * Broadcasts Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/broadcasts
 *
 * Supported Methods:
 * - GET    List all broadcasts
 * - POST   Create a new broadcast
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";

import {
  createBroadcast,
  listBroadcasts,
} from "@/app/(main)/api/v1/broadcasts/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * GET /api/internal/v1/broadcasts
 *
 * List all broadcasts with cursor-based pagination
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return listBroadcasts(session.currentOrganization.id, request);
    }),
  );
}

/**
 * POST /api/internal/v1/broadcasts
 *
 * Create a new broadcast
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return createBroadcast(session.currentOrganization.id, request);
    }),
  );
}
