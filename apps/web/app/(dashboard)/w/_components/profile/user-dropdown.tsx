"use client";

import * as UserDropdown from "@kibamail/owly/user-dropdown";
import { LetterAvatar } from "@kibamail/owly/letter-avatar";
import { Image } from "@/lib/components/image";

import type { UserSession } from "@/lib/auth/get-session";
import { CreateWorkspace } from "../workspaces/create-workspace";
import { InviteMembers } from "../workspaces/invite-members";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { Plus, Mail, LogOut } from "iconoir-react";
import { useMutation } from "@tanstack/react-query";
import { internalApi } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { useToast } from "@kibamail/owly/toast";
import { signOutAction } from "@/app/(auth)/actions/sign-out";
import { hasPermission } from "@/lib/auth/permissions";

interface UserDropdownComponentProps {
  session: UserSession;
}

export function UserSessionDropdown({ session }: UserDropdownComponentProps) {
  const createWorkspaceState = useToggleState();
  const inviteMembersState = useToggleState();

  const toast = useToast();

  const router = useRouter();

  const canInviteMembers = hasPermission(session, "invite:members");

  const { mutate: activateWorkspace } = useMutation({
    async mutationFn(workspaceId: string) {
      const t = toast.loading("Switching workspaces...");
      await internalApi.workspaces().activate(workspaceId);

      toast.dismiss(t);
    },
    onSuccess(_, workspaceId) {
      const workspace = session.organizations.find(
        (org) => org.id === workspaceId
      );
      toast.success(`Switched to workspace ${workspace?.name}`);
      router.refresh();
    },
  });

  return (
    <>
      <UserDropdown.Root>
        <UserDropdown.Trigger>
          {session.currentOrganization?.branding?.logoUrl ? (
            <Image
              src={session.currentOrganization.branding.logoUrl}
              alt={session.currentOrganization.name}
              width={20}
              height={20}
              className="h-5 w-5 rounded-md object-cover"
            />
          ) : (
            <LetterAvatar size="xs">
              {session.currentOrganization?.name}
            </LetterAvatar>
          )}
          <span>{session.currentOrganization?.name}</span>
        </UserDropdown.Trigger>

        <UserDropdown.Content>
          {session.organizations.map((org) => {
            const selected = org.id === session.currentOrganization?.id;
            return (
              <UserDropdown.Item
                key={org.id}
                selected={selected}
                onClick={() => activateWorkspace(org.id)}
              >
                {org.branding?.logoUrl ? (
                  <Image
                    src={org.branding.logoUrl}
                    alt={org.name}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-md object-cover"
                  />
                ) : (
                  <LetterAvatar size="xs">{org.name}</LetterAvatar>
                )}
                {org.name}
              </UserDropdown.Item>
            );
          })}
          <UserDropdown.Divider />
          <UserDropdown.Item
            onClick={() => createWorkspaceState.onOpenChange?.(true)}
          >
            <Plus />
            New workspace
          </UserDropdown.Item>
          <UserDropdown.Item
            onClick={() => inviteMembersState.onOpenChange?.(true)}
            disabled={!canInviteMembers}
          >
            <Mail />
            Invite members
          </UserDropdown.Item>

          <UserDropdown.Divider />

          <UserDropdown.Item onClick={signOutAction}>
            <LogOut />
            Sign out
          </UserDropdown.Item>
        </UserDropdown.Content>
      </UserDropdown.Root>

      <CreateWorkspace {...createWorkspaceState} />
      {canInviteMembers && <InviteMembers {...inviteMembersState} />}
    </>
  );
}
