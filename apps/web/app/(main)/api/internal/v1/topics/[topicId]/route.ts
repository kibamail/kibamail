/**
 * Individual Topic Management Route (Internal API)
 *
 * GET    /api/internal/v1/topics/[topicId] - Get specific topic
 * PUT    /api/internal/v1/topics/[topicId] - Update specific topic
 * DELETE /api/internal/v1/topics/[topicId] - Delete specific topic
 *
 * Uses session-based authentication and reuses external API handlers
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getTopic, updateTopic, deleteTopic } from "@/app/(main)/api/v1/topics/handler";

/**
 * GET /api/internal/v1/topics/[topicId]
 *
 * Get a specific topic
 * Requires: read:topics permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getTopic(session.currentOrganization.id, topicId);
      },
      ["read:topics"]
    )
  );
}

/**
 * PUT /api/internal/v1/topics/[topicId]
 *
 * Update a specific topic
 * Requires: manage:topics permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateTopic(session.currentOrganization.id, topicId, request);
      },
      ["manage:topics"]
    )
  );
}

/**
 * DELETE /api/internal/v1/topics/[topicId]
 *
 * Delete a specific topic
 * Requires: manage:topics permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteTopic(session.currentOrganization.id, topicId);
      },
      ["manage:topics"]
    )
  );
}
