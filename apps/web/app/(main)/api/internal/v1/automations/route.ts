/**
 * Automations Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/automations
 *
 * Supported Methods:
 * - GET    List all automations
 * - POST   Create a new automation
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createAutomation, listAutomations } from "@/app/(main)/api/v1/automations/handler";

/**
 * GET /api/internal/v1/automations
 *
 * List all automations with cursor-based pagination
 * Requires: read:automations permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return listAutomations(session.currentOrganization.id, request);
      },
      ["read:automations"]
    )
  );
}

/**
 * POST /api/internal/v1/automations
 *
 * Create a new automation
 * Requires: manage:automations permission
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
        return createAutomation(session.currentOrganization.id, request);
      },
      ["manage:automations"]
    )
  );
}
