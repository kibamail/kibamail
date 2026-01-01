"use client";

import { Button } from "@kibamail/owly";
import { Check } from "iconoir-react";
import { useFormEditor } from "./form-editor-context";

export function SaveFormButton() {
  const { saveStatus, save, hasUnsavedChanges } = useFormEditor();

  const isDisabled = saveStatus === "saving" || (!hasUnsavedChanges && saveStatus === "idle");

  return (
    <Button
      variant="secondary"
      onClick={save}
      disabled={isDisabled}
      className="min-w-[140px] transition-all duration-200"
    >
      {saveStatus === "saving" && (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Saving...
        </>
      )}

      {saveStatus === "success" && (
        <span className="flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Saved</span>
        </span>
      )}

      {saveStatus === "error" && (
        <span className="text-red-600">Failed to save</span>
      )}

      {saveStatus === "idle" && "Save changes"}
    </Button>
  );
}
