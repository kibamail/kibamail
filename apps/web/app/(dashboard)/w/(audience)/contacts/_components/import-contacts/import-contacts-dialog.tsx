"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Xmark } from "iconoir-react";
import { useEffect, type PropsWithChildren } from "react";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { useImportContactsStore } from "./store/import-contacts-store";
import { StepOneUploadCsv } from "./steps/step-one-upload-csv";
import { StepTwoMatchHeaders } from "./steps/step-two-match-headers";
import { StepThreeImportSettings } from "./steps/step-three-import-settings";
import { StepFourProcessing } from "./steps/step-four-processing";

interface ImportContactsDialogProps extends ToggleState {
  onImportCompleted?: () => void;
}

function StepsRenderer({
  current,
  onClose,
}: {
  current: number;
  onClose: () => void;
}) {
  switch (current) {
    case 0:
      return <StepOneUploadCsv onClose={onClose} />;
    case 1:
      return <StepTwoMatchHeaders />;
    case 2:
      return <StepThreeImportSettings />;
    case 3:
      return <StepFourProcessing onClose={onClose} />;
    default:
      return <StepOneUploadCsv onClose={onClose} />;
  }
}

export function ImportContactsDialog({
  open,
  onOpenChange,
  onImportCompleted,
}: PropsWithChildren<ImportContactsDialogProps>) {
  const { step, reset } = useImportContactsStore();

  function onDialogOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onImportCompleted?.();
      reset();
    }
    onOpenChange?.(isOpen);
  }

  function onClose() {
    onDialogOpenChange(false);
  }

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onDialogOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="w-screen h-screen p-6 lg:p-10 bg-kb-bg-secondary fixed overflow-y-auto top-0 left-0 focus:outline-none z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <VisuallyHidden>
            <DialogPrimitive.Title>Import Contacts</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Upload a CSV file to import contacts into your audience.
            </DialogPrimitive.Description>
          </VisuallyHidden>

          <div className="flex justify-end pb-6 lg:pb-10">
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="p-2 rounded-lg hover:bg-kb-bg-tertiary transition-colors"
              >
                <Xmark className="w-6 h-6" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="w-full max-w-[640px] mx-auto grid grid-cols-1 gap-y-2">
            <StepsRenderer current={step} onClose={onClose} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
