"use client";

import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { MoreHoriz, Trash, User } from "iconoir-react";

interface Member {
  id: string;
  email: string;
  role: string;
}

interface MemberActionsDropdownProps {
  member: Member;
  onChangeRole: (member: Member) => void;
  isCurrentUser: boolean;
}

export function MemberActionsDropdown({
  member,
  onChangeRole,
  isCurrentUser,
}: MemberActionsDropdownProps) {
  const handleChangeRole = () => {
    onChangeRole(member);
  };

  const handleRemoveMember = () => {
    // TODO: Implement remove member functionality
    console.log("Remove member", member.email);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item onClick={handleChangeRole} disabled={isCurrentUser}>
          <User className="w-4 h-4" />
          Change role
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          className="text-kb-content-negative"
          onClick={handleRemoveMember}
          disabled={isCurrentUser}
        >
          <Trash className="w-4 h-4" />
          Remove member
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
