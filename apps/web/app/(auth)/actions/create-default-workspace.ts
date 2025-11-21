/**
 * Create Default Workspace Server Action
 *
 * Checks if the authenticated user has any organizations, and if not,
 * creates a default workspace for them. The workspace is named after
 * the user's email and the user is automatically added as a member.
 *
 * @returns The created organization/workspace object, or undefined if user already has organizations
 *
 * @example
 * await createDefaultWorkspaceAction();
 */

"use server";

import { redirect } from "next/navigation";

import { createWorkspaceViaLogto } from "@/app/api/internal/v1/workspaces/handler";
import { getLogtoContext } from "@logto/next/server-actions";
import { logtoConfig } from "@/config/logto";

export async function createDefaultWorkspaceAction() {
  const ctx = await getLogtoContext(logtoConfig, {
    fetchUserInfo: true,
  });

  if (!ctx.isAuthenticated) {
    return redirect("/");
  }

  if (!ctx.userInfo?.organizations || ctx.userInfo.organizations.length === 0) {
    if (!ctx.userInfo?.sub || !ctx.userInfo?.email) {
      throw new Error("User information is required to create a workspace");
    }

    await createWorkspaceViaLogto(
      { name: ctx.userInfo?.email },
      ctx.userInfo?.sub,
    );
  }

  return undefined;
}
