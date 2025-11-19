/**
 * Forms Collection Route (External API)
 *
 * POST   /api/v1/forms - Create new form
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { createForm } from "./handler";

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
      ["write:forms"]
    )
  );
}
