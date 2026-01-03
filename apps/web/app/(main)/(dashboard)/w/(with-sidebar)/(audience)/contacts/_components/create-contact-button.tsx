"use client";

import { Button, type ButtonProps } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateContactModal } from "./create-contact-modal";

interface CreateContactButtonProps extends ButtonProps {}

export function CreateContactButton({ ...props }: CreateContactButtonProps) {
  const createContactState = useToggleState();

  return (
    <>
      <Button
        {...props}
        onClick={() => createContactState.onOpenChange?.(true)}
      >
        <Plus className="w-4 h-4" />
        Add Contact
      </Button>

      <CreateContactModal {...createContactState} />
    </>
  );
}
