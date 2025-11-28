"use client";

import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import { useToast } from "@kibamail/owly/toast";
import { Send } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface PublishFormDialogProps {
  formId: string;
  formName: string;
}

export function PublishFormDialog({ formId, formName }: PublishFormDialogProps) {
  const router = useRouter();
  const { success: toast, error: errorToast } = useToast();
  const publishDialogState = useToggleState();

  const publishMutation = useMutation({
    async mutationFn() {
      return internalApi.forms().publish(formId);
    },
    onSuccess() {
      toast("Form published successfully.");
      publishDialogState.onOpenChange?.(false);
      router.refresh();
    },
    onError() {
      errorToast("Failed to publish form. Please try again.");
    },
  });

  function onPublish() {
    publishDialogState.onOpenChange?.(true);
  }

  function onConfirmPublish() {
    publishMutation.mutate();
  }

  return (
    <>
      <Button onClick={onPublish}>
        <Send className="transform -rotate-45" /> Publish
      </Button>

      <ConfirmDialog
        {...publishDialogState}
        title="Publish form"
        description={`Are you sure you want to publish "${formName}"? Once published, the form will be live and accessible to your audience.`}
        confirm={{
          children: "Publish",
          onClick: onConfirmPublish,
          loading: publishMutation.isPending,
          disabled: publishMutation.isPending,
        }}
      />
    </>
  );
}
