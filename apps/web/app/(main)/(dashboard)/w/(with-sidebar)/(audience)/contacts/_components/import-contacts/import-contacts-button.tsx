"use client";

import { Button, type ButtonProps } from "@kibamail/owly/button";
import { Upload } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { ImportContactsDialog } from "./import-contacts-dialog";

interface ImportContactsButtonProps extends Omit<ButtonProps, "onClick"> {
  onImportCompleted?: () => void;
}

export function ImportContactsButton({
  onImportCompleted,
  ...props
}: ImportContactsButtonProps) {
  const importContactsState = useToggleState();

  return (
    <>
      <Button
        variant="secondary"
        {...props}
        onClick={() => importContactsState.onOpenChange?.(true)}
      >
        <Upload className="w-4 h-4" />
        Import contacts
      </Button>

      <ImportContactsDialog
        {...importContactsState}
        onImportCompleted={onImportCompleted}
      />
    </>
  );
}
