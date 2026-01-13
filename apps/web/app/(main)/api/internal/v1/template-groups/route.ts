/**
 * Template Groups Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/template-groups
 *
 * Supported Methods:
 * - GET    List all template groups
 * - POST   Create a new template group
 */

import type { NextRequest } from "next/server";
import { createTemplateGroup, listTemplateGroups } from "./handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * GET /api/internal/v1/template-groups
 *
 * List all template groups with cursor-based pagination.
 * Requires: read:templates permission
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
        return listTemplateGroups(session.currentOrganization.id, request);
      },
      ["read:templates"],
    ),
  );
}

/**
 * POST /api/internal/v1/template-groups
 *
 * Create a new template group.
 * Requires: manage:templates permission
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
        return createTemplateGroup(session.currentOrganization.id, request);
      },
      ["manage:templates"],
    ),
  );
}
