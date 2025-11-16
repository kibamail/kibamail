"use client";

import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { EditPencil, MoreHoriz, Trash } from "iconoir-react";

interface ContactActionsDropdownProps {
  variant?: "icon" | "default";
}

export function ContactActionsDropdown({
  variant = "icon",
}: ContactActionsDropdownProps) {
  function onEdit() {
    // TODO: Implement edit functionality
    console.log("Edit contact");
  }

  function onDelete() {
    // TODO: Implement delete functionality
    console.log("Delete contact");
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {variant === "icon" ? (
          <Button variant="secondary" size="sm">
            <MoreHoriz className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="secondary">
            <MoreHoriz className="w-4 h-4" />
          </Button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item onClick={onEdit}>
          <EditPencil className="w-4 h-4" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          className="text-kb-content-negative"
          onClick={onDelete}
        >
          <Trash className="w-4 h-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
