/**
 * Workspaces Collection - Handlers
 *
 * Business logic for /api/internal/v1/workspaces endpoints
 */

import type { NextRequest } from "next/server";

import { logto } from "@/auth/logto";
import { InternalServerError } from "@/lib/api/errors";
import { responseCreated } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import type { UserSession } from "@/lib/auth/get-session";
import { Cookies, CookieKey } from "@/lib/cookies";
import { createWorkspaceSchema } from "./schema";
import { OWNER_ROLE } from "@/config/rbac";

export async function createWorkspaceViaLogto(
  data: { name: string; description?: string },
  userId: string,
) {
  const workspace = await logto.workspaces().create({
    name: data.name,
    description: data.description,
  });

  const ownerRoleId = await logto
    .workspaces()
    .members(workspace.id)
    .getRoleIdByName(OWNER_ROLE);

  if (!ownerRoleId) {
    throw new InternalServerError("Owner role not found");
  }

  const response = await logto
    .workspaces()
    .members(workspace.id)
    .add(userId, [ownerRoleId]);

  if (!ownerRoleId) {
    throw new InternalServerError("Owner role not found");
  }

  if (response.error) {
    throw response.error;
  }

  return workspace;
}

/**
 * POST /api/internal/v1/workspaces
 *
 * Create a new workspace
 */
export async function createWorkspace(
  session: UserSession,
  request: NextRequest,
) {
  const data = await validateRequestBody(createWorkspaceSchema, request);

  const workspace = await createWorkspaceViaLogto(data, session.user.sub);

  await Cookies.set(CookieKey.ACTIVE_WORKSPACE_ID, workspace.id);

  return responseCreated({
    data: {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description ?? null,
    },
  });
}
