/**
 * Activate Workspace - Handler
 *
 * Business logic for /api/internal/v1/workspaces/:id/activate endpoint
 */

import { BadRequestError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { CookieKey, Cookies } from "@/lib/cookies";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * POST /api/internal/v1/workspaces/:id/activate
 *
 * Set the specified workspace as the active workspace
 */
export async function activateWorkspace(session: UserSession, id: string) {
  // Check if user has access to the requested workspace
  const workspace = session.organizations.find((org) => org.id === id);

  if (!workspace) {
    throw new BadRequestError(
      "Workspace not found or you don't have access to it",
    );
  }

  await Cookies.set(CookieKey.ACTIVE_WORKSPACE_ID, id);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session.user.sub,
    event: "workspace_switched",
    properties: {
      workspace_id: id,
      workspace_name: workspace.name,
    },
  });

  return responseOk({ success: true });
}
