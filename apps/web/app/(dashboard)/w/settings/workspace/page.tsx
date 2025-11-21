/**
 * Workspace Settings Page
 *
 * Manage workspace members and permissions.
 * Displays team members and allows inviting new members.
 */

import { logto } from "@/auth/logto";
import { getSession } from "@/lib/auth/get-session";
import { hasPermission } from "@/lib/auth/permissions";
import { WorkspaceSettings } from "./_components/workspace-settings";

export default async function WorkspaceSettingsPage() {
  const session = await getSession();
  const workspaceId = session.currentOrganization?.id as string;

  const canManageMembers = hasPermission(session, "manage:members");

  const [members, invitations] = canManageMembers
    ? await Promise.all([
        logto.workspaces().members(workspaceId).list(),
        logto.workspaces().members(workspaceId).listInvitations(),
      ])
    : [[], []];

  return (
    <WorkspaceSettings
      members={members ?? []}
      invitations={invitations ?? []}
      canManageMembers={canManageMembers}
      currentUserId={session.user.sub}
      workspaceName={session.currentOrganization?.name ?? ""}
    />
  );
}
