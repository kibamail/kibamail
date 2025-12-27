"use client";

import { Button, type ButtonProps } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateContactPropertyModal } from "./create-contact-property-modal";

interface CreateContactPropertyButtonProps extends ButtonProps {}

export function CreateContactPropertyButton({ ...props }: CreateContactPropertyButtonProps) {
  const createPropertyState = useToggleState();

  return (
    <>
      <Button {...props} onClick={() => createPropertyState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Add Property
      </Button>

      <CreateContactPropertyModal {...createPropertyState} />
    </>
  );
}
