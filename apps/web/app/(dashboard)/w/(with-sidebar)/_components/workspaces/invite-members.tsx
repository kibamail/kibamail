"use client";

import * as Dialog from "@kibamail/owly/dialog";
import { Button } from "@kibamail/owly/button";
import * as TextField from "@kibamail/owly/text-field";
import * as Select from "@kibamail/owly/select-field";
import { Mail } from "iconoir-react";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { ROLES } from "@/config/rbac";
import { internalApi } from "@/lib/api/client";
import { useOrganization } from "@/lib/contexts/user-context";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@kibamail/owly/toast";

interface InviteMembersProps extends ToggleState {
  mode?: "invite" | "change-role";
  member?: {
    id: string;
    email: string;
    role: string;
  };
}

const LEAST_PRIVILEGE_ROLE = ROLES[ROLES.length - 1];

export function InviteMembers({
  open,
  onOpenChange,
  mode = "invite",
  member,
}: InviteMembersProps) {
  const workspace = useOrganization();

  const { success: toast } = useToast();

  const inviteMutation = useMutation({
    async mutationFn(data: { email: string; role: string }) {
      return internalApi
        .workspaces()
        .members(workspace?.id as string)
        .invite(data);
    },
    onSuccess(_, variables) {
      const roleDisplayName =
        ROLES.find((r) => r.name === variables.role)?.displayName ??
        variables.role;

      onOpenChange?.(false);

      toast(
        `${variables.email} has been invited to join as ${roleDisplayName}.`
      );
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async (data: { role: string }) => {
      if (!member?.id || !workspace?.id) {
        throw new Error("Member ID and workspace ID are required");
      }

      return internalApi
        .workspaces()
        .members(workspace.id)
        .changeRole(member.id, data);
    },
    onSuccess(_, variables) {
      const roleDisplayName =
        ROLES.find((r) => r.name === variables.role)?.displayName ??
        variables.role;

      onOpenChange?.(false);

      toast(`${member?.email}'s role has been changed to ${roleDisplayName}.`);
    },
  });

  const { mutate, isPending } =
    mode === "invite" ? inviteMutation : changeRoleMutation;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;

    if (mode === "invite") {
      inviteMutation.mutate({ email, role });
    } else {
      changeRoleMutation.mutate({ role });
    }
  }

  const isInviteMode = mode === "invite";
  const defaultRole = isInviteMode ? LEAST_PRIVILEGE_ROLE.name : member?.role;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-sm">
        <Dialog.Header>
          <Dialog.Title>
            {isInviteMode ? "Invite member to workspace" : "Change member role"}
          </Dialog.Title>
          <Dialog.Description>
            {isInviteMode
              ? "Invite a team member to collaborate in your workspace."
              : `Update the role for ${member?.email}.`}
          </Dialog.Description>
        </Dialog.Header>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-kb-content-secondary"
              >
                Email address
              </label>
              <TextField.Root
                id="email"
                name="email"
                type="email"
                placeholder="colleague@example.com"
                required={isInviteMode}
                readOnly={!isInviteMode}
                defaultValue={member?.email}
                className={!isInviteMode ? "opacity-60" : ""}
              >
                <TextField.Slot side="left">
                  <Mail />
                </TextField.Slot>
              </TextField.Root>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="role"
                className="text-sm font-medium text-kb-content-secondary"
              >
                Role
              </label>
              <Select.Root name="role" defaultValue={defaultRole}>
                <Select.Trigger placeholder="Select role" />
                <Select.Content className="z-50">
                  {ROLES.map((role) => (
                    <Select.Item key={role.name} value={role.name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.displayName}</span>
                      </div>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          <Dialog.Footer className="flex justify-between">
            <Dialog.Close asChild>
              <Button variant="secondary" disabled={isPending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" loading={isPending}>
              {isInviteMode ? "Send invitation" : "Update role"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
