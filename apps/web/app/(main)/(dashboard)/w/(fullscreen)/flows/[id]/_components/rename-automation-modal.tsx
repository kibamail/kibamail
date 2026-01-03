"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import { Button } from "@kibamail/owly/button";
import { Spinner } from "@kibamail/owly/spinner";
import { useToast } from "@kibamail/owly/toast";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import { useRouter } from "next/navigation";

interface RenameAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automationId: string;
  currentName: string;
}

export function RenameAutomationModal({
  open,
  onOpenChange,
  automationId,
  currentName,
}: RenameAutomationModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const { mutate: updateName, isPending } = useMutation({
    mutationFn: async () => {
      return await internalApi.automations().update(automationId, { name });
    },
    onSuccess: () => {
      toast("Automation renamed successfully");
      onOpenChange(false);
      router.refresh();
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim()) {
      updateName();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-md">
        <Dialog.Header>
          <Dialog.Title>Rename Automation</Dialog.Title>
        </Dialog.Header>

        <form onSubmit={onSubmit}>
          <div className="px-5 py-4">
            <TextField.Root
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            >
              <TextField.Label>Name</TextField.Label>
            </TextField.Root>
          </div>

          <Dialog.Footer>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
