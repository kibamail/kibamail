/**
 * Individual Topic Management Route (External API)
 *
 * GET    /api/v1/topics/[topicId] - Get specific topic
 * PUT    /api/v1/topics/[topicId] - Update specific topic
 * DELETE /api/v1/topics/[topicId] - Delete specific topic
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { getTopic, updateTopic, deleteTopic } from "../handler";

/**
 * GET /api/v1/topics/[topicId]
 *
 * Get a specific topic
 * Requires API key authentication with read:topics scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getTopic(apiKey, topicId),
      ["read:topics"]
    )
  );
}

/**
 * PUT /api/v1/topics/[topicId]
 *
 * Update a specific topic
 * Requires API key authentication with update:topics scope
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => updateTopic(apiKey, topicId, request),
      ["update:topics"]
    )
  );
}

/**
 * DELETE /api/v1/topics/[topicId]
 *
 * Delete a specific topic
 * Requires API key authentication with delete:topics scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteTopic(apiKey, topicId),
      ["delete:topics"]
    )
  );
}
