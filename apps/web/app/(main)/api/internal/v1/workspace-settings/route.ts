/**
 * Workspace Settings Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/workspace-settings
 *
 * Supported Methods:
 * - GET    Get workspace settings (returns defaults if none configured)
 * - PUT    Create or update workspace settings
 *
 * Uses session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getWorkspaceSettings, updateWorkspaceSettings } from "./handler";

/**
 * GET /api/internal/v1/workspace-settings
 *
 * Get workspace settings for the current workspace
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return getWorkspaceSettings(session.currentOrganization.id);
    }),
  );
}

/**
 * PUT /api/internal/v1/workspace-settings
 *
 * Create or update workspace settings for the current workspace
 */
export async function PUT(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return updateWorkspaceSettings(
        session.currentOrganization.id,
        request,
      );
    }),
  );
}
