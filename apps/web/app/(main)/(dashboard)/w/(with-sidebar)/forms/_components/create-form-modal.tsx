"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as Select from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

/**
 * Default empty spec for new forms created from the dashboard.
 * Creates a minimal form with an email field.
 */
function createDefaultSpec(formName: string) {
  return {
    spec: {
      root: "form",
      elements: {
        form: {
          type: "FormRoot",
          props: { submitLabel: "Submit", loadingLabel: "Submitting..." },
          children: ["title", "email-field"],
        },
        title: {
          type: "Heading",
          props: { level: 2, text: formName },
        },
        "email-field": {
          type: "Input",
          props: {
            name: "email",
            label: "Email address",
            placeholder: "you@example.com",
            type: "email",
            checks: [
              { type: "required", message: "Email is required" },
              { type: "email", message: "Please enter a valid email" },
            ],
          },
        },
      },
    },
    fieldMapping: {
      email: {
        contactPropertyId: "email",
        contactPropertyType: "standard" as const,
        fieldType: "string" as const,
      },
    },
  };
}

interface FormData {
  name: string;
  type: "SIGN_UP" | "SURVEY";
}

interface CreateFormModalProps extends ToggleState {}

export function CreateFormModal({ open, onOpenChange }: CreateFormModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const nameFieldId = useId();
  const [selectedType, setSelectedType] = useState<"SIGN_UP" | "SURVEY">(
    "SIGN_UP",
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      type: "SIGN_UP",
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: "", type: "SIGN_UP" });
      setSelectedType("SIGN_UP");
    }
  }, [open, reset]);

  const mutation = useMutation<{ id: string }, Error, FormData>({
    async mutationFn(data: FormData) {
      const defaults = createDefaultSpec(data.name);
      return internalApi.forms().create({
        name: data.name,
        type: data.type,
        display: "INLINE_EMBED",
        ...defaults,
      });
    },
    onSuccess(data) {
      toast("Form created successfully");
      onOpenChange?.(false);
      router.push(`/w/forms/${data.id}/edit`);
      router.refresh();
    },
  });

  function onClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: FormData) {
    mutation.mutate({ ...data, type: selectedType });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>Create New Form</Dialog.Title>
            <Dialog.Description>
              Create a form to collect information from your audience.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id={nameFieldId}
              placeholder="Newsletter Sign Up"
              {...register("name", {
                required: "Form name is required",
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

            <Select.Root
              value={selectedType}
              onValueChange={(value) =>
                setSelectedType(value as "SIGN_UP" | "SURVEY")
              }
            >
              <Select.Label>Form Type</Select.Label>
              <Select.Trigger placeholder="Select form type" />
              <Select.Content className="z-50">
                <Select.Item value="SIGN_UP">Sign Up</Select.Item>
                <Select.Item value="SURVEY" disabled>
                  Survey (Coming soon)
                </Select.Item>
              </Select.Content>
            </Select.Root>
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
              Create Form
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
