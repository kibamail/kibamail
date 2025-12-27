"use client";

import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import { useToast } from "@kibamail/owly/toast";
import { EditPencil } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import type { FormStatus } from "@prisma/client";
import { Text } from "@kibamail/owly";

interface EditFormButtonProps {
  formId: string;
  formName: string;
  formStatus: FormStatus;
  draftVersionId?: string;
  variant?: "primary" | "secondary" | "tertiary" | "destructive";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function EditFormButton({
  formId,
  formName,
  formStatus,
  draftVersionId,
  variant = "secondary",
  size = "sm",
  showLabel = true,
}: EditFormButtonProps) {
  const router = useRouter();
  const { success: toast, error: errorToast } = useToast();
  const createDraftDialogState = useToggleState();

  const createVersionMutation = useMutation({
    async mutationFn() {
      return internalApi.forms().createVersion(formId);
    },
    onSuccess(data) {
      toast("New draft created successfully.");
      createDraftDialogState.onOpenChange?.(false);
      router.push(`/w/forms/${data.id}`);
    },
    onError() {
      errorToast("Failed to create draft. Please try again.");
    },
  });

  function handleEdit() {
    // If form is DRAFT, navigate directly to edit page
    if (formStatus === "DRAFT") {
      router.push(`/w/forms/${formId}`);
      return;
    }

    // If there's already a draft version, navigate to it
    if (draftVersionId) {
      router.push(`/w/forms/${draftVersionId}`);
      return;
    }

    // If form is PUBLISHED or ARCHIVED with no draft, show dialog to create new draft
    createDraftDialogState.onOpenChange?.(true);
  }

  function onConfirmCreateDraft() {
    createVersionMutation.mutate();
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleEdit}>
        <EditPencil className="w-4 h-4" />
        {showLabel && "Edit"}
      </Button>

      <ConfirmDialog
        {...createDraftDialogState}
        title="Create new draft"
        description={`"${formName}" is published.`}
        confirm={{
          children: "Create Draft",
          onClick: onConfirmCreateDraft,
          loading: createVersionMutation.isPending,
          disabled: createVersionMutation.isPending,
        }}
      >
        <div className="p-6">
          <Text>
            To make changes, you need to create a new draft version. The
            published version will remain live until you publish the new draft.
          </Text>
        </div>
      </ConfirmDialog>
    </>
  );
}
