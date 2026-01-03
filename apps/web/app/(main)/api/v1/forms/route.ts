/**
 * Forms Collection Route (External API)
 *
 * GET    /api/v1/forms - List all forms
 * POST   /api/v1/forms - Create new form
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { createForm, listForms } from "./handler";

/**
 * GET /api/v1/forms
 *
 * List all forms with cursor-based pagination
 * Requires API key authentication with read:forms scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listForms(apiKey.workspaceId, request),
      ["read:forms"],
    ),
  );
}

/**
 * POST /api/v1/forms
 *
 * Create a new form
 * Requires API key authentication with write:forms scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createForm(apiKey.workspaceId, request),
      ["write:forms"],
    ),
  );
}
