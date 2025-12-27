"use client";

import { Button, type ButtonProps } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateApiKeyModal } from "./create-api-key-modal";

interface CreateApiKeyButtonProps extends ButtonProps {}

export function CreateApiKeyButton({ ...props }: CreateApiKeyButtonProps) {
  const createApiKeyState = useToggleState();

  return (
    <>
      <Button {...props} onClick={() => createApiKeyState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Create api Key
      </Button>

      <CreateApiKeyModal {...createApiKeyState} />
    </>
  );
}
