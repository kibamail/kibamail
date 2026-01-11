"use client";

import { Button } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateTemplateModal } from "./create-template-modal";

export function CreateTemplateButton() {
  const modalState = useToggleState();

  return (
    <>
      <Button onClick={() => modalState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Create Template
      </Button>
      <CreateTemplateModal {...modalState} />
    </>
  );
}
