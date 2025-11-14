/**
 * API Keys Management Route (External API)
 *
 * POST   /api/v1/api-keys - Create new API key
 * GET    /api/v1/api-keys - List API keys (paginated)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { createApiKeyHandler } from "./handlers/create-api-key";
import { listApiKeysHandler } from "./handlers/list-api-keys";

/**
 * POST /api/v1/api-keys
 *
 * Create a new API key
 * Requires API key authentication
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(request, (apiKey, request) =>
      createApiKeyHandler(apiKey.workspaceId, request),
    ),
  );
}

/**
 * GET /api/v1/api-keys
 *
 * Get all API keys for the workspace
 * Requires API key authentication
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(request, (apiKey, request) =>
      listApiKeysHandler(apiKey.workspaceId, request),
    ),
  );
}
