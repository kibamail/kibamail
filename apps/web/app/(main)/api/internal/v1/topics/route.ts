/**
 * Topics Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/topics
 *
 * Supported Methods:
 * - POST   Create a new topic
 * - GET    List all topics for workspace
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { createTopic, listTopics } from "@/app/(main)/api/v1/topics/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * POST /api/internal/v1/topics
 *
 * Create a new topic
 * Requires: manage:topics permission
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
        return createTopic(session.currentOrganization.id, request);
      },
      ["manage:topics"],
    ),
  );
}

/**
 * GET /api/internal/v1/topics
 *
 * List all topics for workspace
 * Requires: read:topics permission
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
        return listTopics(session.currentOrganization.id, request);
      },
      ["read:topics"],
    ),
  );
}
