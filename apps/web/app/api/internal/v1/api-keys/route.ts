/**
 * API Keys Collection Endpoint
 *
 * REST endpoint: /api/internal/v1/api-keys
 *
 * Supported Methods:
 * - POST   Create a new API key
 * - GET    List all API keys for workspace
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createApiKey, listApiKeys } from "./handler";

/**
 * POST /api/internal/v1/api-keys
 *
 * Create a new API key
 * Requires: manage:api-keys permission
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session) => createApiKey(session, request), [
      "manage:api-keys",
    ]),
  );
}

/**
 * GET /api/internal/v1/api-keys
 *
 * List all API keys for workspace
 * Requires: read:api-keys permission
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session) => listApiKeys(session), ["read:api-keys"]),
  );
}
