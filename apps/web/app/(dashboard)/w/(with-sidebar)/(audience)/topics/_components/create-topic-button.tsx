"use client";

import { Button, type ButtonProps } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateTopicModal } from "./create-topic-modal";

interface CreateTopicButtonProps extends ButtonProps {}

export function CreateTopicButton({ ...props }: CreateTopicButtonProps) {
  const createTopicState = useToggleState();

  return (
    <>
      <Button {...props} onClick={() => createTopicState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Create Topic
      </Button>

      <CreateTopicModal {...createTopicState} />
    </>
  );
}
