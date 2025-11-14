/**
 * Topics Collection Route (External API)
 *
 * POST   /api/v1/topics - Create new topic
 * GET    /api/v1/topics - List topics with pagination
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { createTopic, listTopics } from "./handler";

/**
 * POST /api/v1/topics
 *
 * Create a new topic
 * Requires API key authentication with write:topics scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createTopic(apiKey.workspaceId, request),
      ["write:topics"]
    )
  );
}

/**
 * GET /api/v1/topics
 *
 * List topics with cursor-based pagination
 * Requires API key authentication with read:topics scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listTopics(apiKey.workspaceId, request),
      ["read:topics"]
    )
  );
}
