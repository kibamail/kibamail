/**
 * Activate Workspace - Handler
 *
 * Business logic for /api/internal/v1/workspaces/:id/activate endpoint
 */

import { BadRequestError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { Cookies, CookieKey } from "@/lib/cookies";

/**
 * POST /api/internal/v1/workspaces/:id/activate
 *
 * Set the specified workspace as the active workspace
 */
export async function activateWorkspace(session: UserSession, id: string) {
  // Check if user has access to the requested workspace
  const hasAccess = session.organizations.some((org) => org.id === id);

  if (!hasAccess) {
    throw new BadRequestError(
      "Workspace not found or you don't have access to it",
    );
  }

  await Cookies.set(CookieKey.ACTIVE_WORKSPACE_ID, id);

  return responseOk({ success: true });
}
