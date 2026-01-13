"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface FormData {
  name: string;
  uniqueSlug: string;
}

interface CreateTemplateModalProps extends ToggleState {}

export function CreateTemplateModal({
  open,
  onOpenChange,
}: CreateTemplateModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const nameFieldId = useId();
  const slugFieldId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      uniqueSlug: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: "", uniqueSlug: "" });
    }
  }, [open, reset]);

  const mutation = useMutation<{ id: string }, Error, FormData>({
    async mutationFn(data: FormData) {
      return internalApi.emailTemplates().create({
        name: data.name,
        uniqueSlug: data.uniqueSlug || undefined,
      });
    },
    onSuccess(data) {
      toast("Template created successfully");
      onClose();
      router.push(`/w/templates/${data.id}`);
      router.refresh();
    },
  });

  function onClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: FormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>Create new template</Dialog.Title>
            <Dialog.Description>
              Create a reusable email template for your transactional emails.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id={nameFieldId}
              placeholder="Welcome Email"
              {...register("name", {
                required: "Template name is required",
                maxLength: {
                  value: 255,
                  message: "Name must be 255 characters or less",
                },
              })}
            >
              <TextField.Label>Name</TextField.Label>
              {errors.name && (
                <TextField.Error>{errors.name.message}</TextField.Error>
              )}
            </TextField.Root>

            <TextField.Root
              id={slugFieldId}
              placeholder="welcome_email"
              {...register("uniqueSlug", {
                pattern: {
                  value: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
                  message:
                    "Must start with a letter and contain only letters, numbers, underscores, or hyphens",
                },
                maxLength: {
                  value: 100,
                  message: "Identifier must be 100 characters or less",
                },
              })}
            >
              <TextField.Label>Unique identifier</TextField.Label>
              <TextField.Hint>
                Required when sending transactional emails using this template.
              </TextField.Hint>
              {errors.uniqueSlug && (
                <TextField.Error>{errors.uniqueSlug.message}</TextField.Error>
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
              Create Template
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
