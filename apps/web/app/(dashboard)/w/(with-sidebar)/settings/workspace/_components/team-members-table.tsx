"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as SettingsCard from "@kibamail/owly/settings-card";
import * as Table from "@kibamail/owly/table";
import { Plus } from "iconoir-react";
import type {
  LogtoOrganizationInvitation,
  LogtoOrganizationMember,
} from "@/auth/logto";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { InvitationActionsDropdown } from "./invitation-actions-dropdown";
import { MemberActionsDropdown } from "./member-actions-dropdown";
import { LetterAvatar } from "@kibamail/owly/letter-avatar";

type TableRow =
  | { type: "member"; data: LogtoOrganizationMember }
  | { type: "invitation"; data: LogtoOrganizationInvitation };

interface TeamMembersTableProps {
  members: LogtoOrganizationMember[];
  invitations: LogtoOrganizationInvitation[];
  inviteMembersState: ToggleState;
  onChangeRole: (member: { id: string; email: string; role: string }) => void;
  currentUserId: string;
}

export function TeamMembersTable({
  members,
  invitations,
  inviteMembersState,
  onChangeRole,
  currentUserId,
}: TeamMembersTableProps) {
  // Combine invitations and members, with invitations first
  const rows: TableRow[] = [
    ...invitations.map((inv) => ({ type: "invitation" as const, data: inv })),
    ...members.map((mem) => ({ type: "member" as const, data: mem })),
  ];
  return (
    <SettingsCard.Root>
      <SettingsCard.Header>
        <div>
          <h3 className="text-lg font-semibold text-kb-content-primary">
            Team members
          </h3>
          <p className="text-sm text-kb-content-secondary mt-1">
            Manage who has access to this workspace
          </p>
        </div>
      </SettingsCard.Header>

      <SettingsCard.Content>
        <Table.Container>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Member</Table.Head>
                <Table.Head className="w-[140px]">Role</Table.Head>
                <Table.Head className="w-[140px]">Status</Table.Head>
                <Table.Head className="w-[140px]">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => {
                if (row.type === "invitation") {
                  const invitation = row.data;
                  const role = invitation.organizationRoles[0];
                  return (
                    <Table.Row key={`invitation-${invitation.id}`}>
                      <Table.Cell>
                        <span className="text-sm text-kb-content-secondary">
                          {invitation.invitee}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="neutral" size="sm">
                          {role?.name || "No role"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="warning" size="sm">
                          Pending
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <InvitationActionsDropdown
                          invitation={{
                            id: invitation.id,
                            invitee: invitation.invitee,
                          }}
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                } else {
                  const member = row.data;
                  const role = member.organizationRoles[0];
                  return (
                    <Table.Row key={`member-${member.id}`}>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <LetterAvatar className="size-8!" size="sm">
                            {member.name}
                          </LetterAvatar>
                          <div className="flex flex-col">
                            {member.name && (
                              <span className="font-medium text-sm text-kb-content-primary">
                                {member.name}
                              </span>
                            )}
                            <span className="text-xs text-kb-content-secondary">
                              {member.primaryEmail}
                            </span>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="neutral" size="sm">
                          {role?.name || "No role"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <MemberActionsDropdown
                          member={{
                            id: member.id,
                            email: member.primaryEmail || "",
                            role: role?.name || "",
                          }}
                          onChangeRole={onChangeRole}
                          isCurrentUser={member.id === currentUserId}
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                }
              })}
            </Table.Body>
          </Table.Root>
        </Table.Container>
      </SettingsCard.Content>

      <SettingsCard.Footer>
        <div className="w-full flex items-center justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => inviteMembersState.onOpenChange?.(true)}
          >
            <Plus className="w-4 h-4" />
            Invite member
          </Button>
        </div>
      </SettingsCard.Footer>
    </SettingsCard.Root>
  );
}
