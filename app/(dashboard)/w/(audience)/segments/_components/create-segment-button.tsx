"use client";

import { Button, type ButtonProps } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateSegmentModal } from "./create-segment-modal";

interface CreateSegmentButtonProps extends ButtonProps {}

export function CreateSegmentButton({ ...props }: CreateSegmentButtonProps) {
  const createSegmentState = useToggleState();

  return (
    <>
      <Button {...props} onClick={() => createSegmentState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Create Segment
      </Button>

      <CreateSegmentModal {...createSegmentState} />
    </>
  );
}
