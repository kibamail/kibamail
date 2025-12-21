"use client";

import { useId, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import { Badge } from "@kibamail/owly/badge";
import { useToast } from "@kibamail/owly/toast";
import { InputOutput, ClipboardCheck } from "iconoir-react";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

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
    "SIGN_UP"
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
      return internalApi.forms().create({
        name: data.name,
        type: data.type,
        display: "INLINE_EMBED",
        fields: { pages: [] },
      });
    },
    onSuccess(data) {
      toast("Form created successfully");
      onClose();
      router.push(`/forms/${data.id}`);
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-kb-content-primary">
                Form Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType("SIGN_UP")}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedType === "SIGN_UP"
                      ? "border-kb-primary bg-kb-primary/5"
                      : "border-kb-border-secondary hover:border-kb-border-primary"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-kb-surface-tertiary flex items-center justify-center">
                      <InputOutput className="w-4 h-4 text-kb-content-secondary" />
                    </div>
                  </div>
                  <div className="font-medium text-kb-content-primary">
                    Sign Up
                  </div>
                  <div className="text-sm text-kb-content-tertiary mt-1">
                    Collect email addresses and subscriber information
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="p-4 rounded-lg border-2 border-kb-border-secondary text-left opacity-50 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-kb-surface-tertiary flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4 text-kb-content-secondary" />
                    </div>
                    <Badge variant="neutral" size="sm">
                      Coming soon
                    </Badge>
                  </div>
                  <div className="font-medium text-kb-content-primary">
                    Survey
                  </div>
                  <div className="text-sm text-kb-content-tertiary mt-1">
                    Gather feedback and responses from your audience
                  </div>
                </button>
              </div>
            </div>
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
