/**
 * Forms Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/forms
 *
 * Supported Methods:
 * - POST   Create a new form
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createForm } from "@/app/api/v1/forms/handler";

/**
 * POST /api/internal/v1/forms
 *
 * Create a new form
 * Requires: manage:forms permission
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
        return createForm(session.currentOrganization.id, request);
      },
      ["manage:forms"]
    )
  );
}
