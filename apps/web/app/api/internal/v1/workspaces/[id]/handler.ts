/**
 * Update Workspace - Handler
 *
 * Business logic for PATCH /api/internal/v1/workspaces/:id endpoint
 */

import { BadRequestError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { invalidateOrganizationCache } from "@/lib/auth/user-cache";
import { logto } from "@/auth/logto";
import { updateWorkspaceSchema } from "./schema";

/**
 * PATCH /api/internal/v1/workspaces/:id
 *
 * Update workspace name, description, and/or logo
 */
export async function updateWorkspace(
  session: UserSession,
  workspaceId: string,
  request: Request,
) {
  // Check if user has access to the workspace
  const hasAccess = session.organizations.some((org) => org.id === workspaceId);

  if (!hasAccess) {
    throw new BadRequestError(
      "Workspace not found or you don't have access to it",
    );
  }

  // Parse and validate request body
  const body = await request.json();
  const data = updateWorkspaceSchema.parse(body);

  // Build update payload for Logto
  const updatePayload: any = {};

  if (data.name !== undefined) {
    updatePayload.name = data.name;
  }

  if (data.description !== undefined) {
    updatePayload.description = data.description;
  }

  if (data.logoUrl !== undefined) {
    updatePayload.branding = {
      logoUrl: data.logoUrl,
    };
  }

  // Update Logto organization
  await logto.workspaces().update(workspaceId, updatePayload);

  // Invalidate organization cache to ensure fresh data on next request
  await invalidateOrganizationCache(workspaceId);

  return responseOk({
    success: true,
  });
}
