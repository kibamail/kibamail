/**
 * Automations Collection Route (External API)
 *
 * POST   /api/v1/automations - Create new automation
 * GET    /api/v1/automations - List automations with pagination
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { createAutomation, listAutomations } from "./handler";

/**
 * POST /api/v1/automations
 *
 * Create a new automation
 * Requires API key authentication with write:automations scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createAutomation(apiKey.workspaceId, request),
      ["write:automations"],
    ),
  );
}

/**
 * GET /api/v1/automations
 *
 * List automations with cursor-based pagination
 * Requires API key authentication with read:automations scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listAutomations(apiKey.workspaceId, request),
      ["read:automations"],
    ),
  );
}
