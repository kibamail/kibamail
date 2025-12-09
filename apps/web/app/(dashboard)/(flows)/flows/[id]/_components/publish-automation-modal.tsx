"use client";

import { useEffect } from "react";
import * as Dialog from "@kibamail/owly/dialog";
import * as Alert from "@kibamail/owly/alert";
import { Button } from "@kibamail/owly/button";
import { Text } from "@kibamail/owly/text";
import { Badge } from "@kibamail/owly/badge";
import { Spinner } from "@kibamail/owly/spinner";
import { useToast } from "@kibamail/owly/toast";
import {
  WarningTriangle,
  CheckCircle,
  SendDiagonal,
} from "iconoir-react";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi, ApiClientError } from "@/lib/api/client";
import { useFlowEditor } from "./flow-editor-context";
import { useRouter } from "next/navigation";
import type { ValidationError } from "@/lib/automations/validation";

interface PublishAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupErrorsByNode(
  errors: ValidationError[]
): Map<string, ValidationError[]> {
  const grouped = new Map<string, ValidationError[]>();

  for (const error of errors) {
    const key = error.nodeId || "flow";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(error);
  }

  return grouped;
}

function ValidationErrorsList({ errors }: { errors: ValidationError[] }) {
  const groupedErrors = groupErrorsByNode(errors);

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {Array.from(groupedErrors.entries()).map(([nodeId, nodeErrors]) => {
        const nodeName = nodeErrors[0]?.nodeName;
        const isFlowError = nodeId === "flow" || nodeId === "";

        return (
          <div
            key={nodeId}
            className="rounded-lg border border-kb-border-tertiary bg-kb-bg-secondary p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              {isFlowError ? (
                <Badge variant="warning" size="sm">
                  Flow Structure
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  {nodeName || "Node"}
                </Badge>
              )}
            </div>
            <ul className="space-y-1.5">
              {nodeErrors.map((error, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <WarningTriangle className="w-4 h-4 text-kb-content-warning mt-0.5 shrink-0" />
                  <Text className="text-sm text-kb-content-secondary">
                    {error.message}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function PublishAutomationModal({
  open,
  onOpenChange,
}: PublishAutomationModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const { automationId, automation, nodeErrors, setNodeErrors, clearNodeErrors } = useFlowEditor();

  useEffect(() => {
    if (open) {
      clearNodeErrors();
    }
  }, [open, clearNodeErrors]);

  const validationErrors: ValidationError[] = [];
  nodeErrors.forEach((errors) => {
    validationErrors.push(...errors);
  });

  const { mutate: publishAutomation, isPending } = useMutation({
    mutationFn: async () => {
      return await internalApi.automations().publish(automationId);
    },
    onSuccess: () => {
      clearNodeErrors();
      onOpenChange(false);
      toast("Automation published successfully");
      router.push("/w/automations");
    },
    onError: (error: Error) => {
      if (error instanceof ApiClientError) {
        const errorData = error.response.error;
        if (typeof errorData === "object" && errorData?.details?.errors) {
          setNodeErrors(errorData.details.errors as ValidationError[]);
          return;
        }
      }
      setNodeErrors([
        {
          nodeId: "",
          field: "publish",
          message: error.message || "Failed to publish automation",
        },
      ]);
    },
  });

  const handlePublish = () => {
    clearNodeErrors();
    publishAutomation();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const hasValidationErrors = validationErrors.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content className="max-w-lg">
        <Dialog.Header>
          <Dialog.Title>
            {hasValidationErrors
              ? "Unable to Publish"
              : "Publish Automation"}
          </Dialog.Title>
        </Dialog.Header>

        <div className="px-5 py-4">
          {hasValidationErrors ? (
            <div className="space-y-4">
              <Alert.Root variant="warning">
                <Alert.Icon>
                  <WarningTriangle className="w-5 h-5" />
                </Alert.Icon>
                <Alert.Title>
                  Please fix the following issues before publishing
                </Alert.Title>
              </Alert.Root>

              <ValidationErrorsList errors={validationErrors} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-kb-bg-secondary border border-kb-border-tertiary">
                <div className="w-10 h-10 rounded-full bg-kb-bg-info-secondary flex items-center justify-center shrink-0">
                  <SendDiagonal className="w-5 h-5 text-kb-content-info" />
                </div>
                <div>
                  <Text className="font-medium text-kb-content-primary mb-1">
                    Ready to go live?
                  </Text>
                  <Text className="text-sm text-kb-content-secondary">
                    Publishing will activate{" "}
                    <span className="font-medium">
                      {automation?.name || "this automation"}
                    </span>{" "}
                    and start processing contacts that match the trigger
                    conditions.
                  </Text>
                </div>
              </div>

              <Alert.Root variant="info">
                <Alert.Icon>
                  <CheckCircle className="w-5 h-5" />
                </Alert.Icon>
                <Alert.Title>
                  Your automation will be validated before publishing
                </Alert.Title>
              </Alert.Root>
            </div>
          )}
        </div>

        <Dialog.Footer>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose}>
              {hasValidationErrors ? "Close" : "Cancel"}
            </Button>
            {!hasValidationErrors && (
              <Button onClick={handlePublish} disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <SendDiagonal className="w-4 h-4 mr-2" />
                    Publish
                  </>
                )}
              </Button>
            )}
          </div>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
