"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import type { TransformedSenderIdentity } from "./sender-select";

interface EditSenderIdentityFormData {
  name: string;
}

interface EditSenderIdentityModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  identity: TransformedSenderIdentity | null;
  onSuccess?: (identity: TransformedSenderIdentity) => void;
}

export function EditSenderIdentityModal({
  open,
  onOpenChange,
  identity,
  onSuccess,
}: EditSenderIdentityModalProps) {
  const { success: toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<EditSenderIdentityFormData>({
    defaultValues: {
      name: identity?.name || "",
    },
  });

  // Reset form when identity changes
  useEffect(() => {
    if (identity) {
      reset({
        name: identity.name,
      });
    }
  }, [identity, reset]);

  const mutation = useMutation({
    mutationFn: async (data: EditSenderIdentityFormData) => {
      if (!identity) throw new Error("No identity selected");
      return await internalApi.senderIdentities().update(identity.id, {
        name: data.name,
      });
    },
    onSuccess: (data) => {
      toast("Sender identity updated successfully");
      onClose();
      onSuccess?.(data as TransformedSenderIdentity);
    },
    setError,
  });

  function onClose() {
    reset({
      name: identity?.name || "",
    });
    onOpenChange?.(false);
  }

  function onSubmit(data: EditSenderIdentityFormData) {
    mutation.mutate(data);
  }

  if (!identity) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content className="max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>Edit Sender Identity</Dialog.Title>
            <Dialog.Description>
              Update the display name for this sender identity.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id="email"
              type="text"
              value={identity.localPart}
              disabled
            >
              <TextField.Label>Email Local Part</TextField.Label>
              <TextField.Hint>
                The email address cannot be changed after creation. To use a
                different email, create a new sender identity.
              </TextField.Hint>
            </TextField.Root>

            <TextField.Root
              id="name"
              type="text"
              placeholder="Sarah from Acme Corp"
              {...register("name", {
                required: "Name is required",
                maxLength: {
                  value: 200,
                  message: "Name must be 200 characters or less",
                },
              })}
            >
              <TextField.Label>Name</TextField.Label>
              <TextField.Hint>
                Display name shown in the &quot;From&quot; field
              </TextField.Hint>
              {errors.name && (
                <TextField.Error>{errors.name.message}</TextField.Error>
              )}
            </TextField.Root>
          </div>

          <Dialog.Footer className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              loading={mutation.isPending}
            >
              Save Changes
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
