/**
 * Tags Management Route (External API)
 *
 * POST   /api/v1/tags - Create new tag
 * GET    /api/v1/tags - List tags (paginated)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { createTag, listTags } from "./handler";

/**
 * POST /api/v1/tags
 *
 * Create a new tag
 * Requires API key authentication with write:tags scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createTag(apiKey, request),
      ["write:tags"]
    ),
  );
}

/**
 * GET /api/v1/tags
 *
 * List tags with pagination
 * Requires API key authentication with read:tags scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listTags(apiKey, request),
      ["read:tags"]
    ),
  );
}
