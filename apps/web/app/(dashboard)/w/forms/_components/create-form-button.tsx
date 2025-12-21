"use client";

import { Button } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateFormModal } from "./create-form-modal";

export function CreateFormButton() {
  const modalState = useToggleState();

  return (
    <>
      <Button onClick={() => modalState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Create Form
      </Button>
      <CreateFormModal {...modalState} />
    </>
  );
}
