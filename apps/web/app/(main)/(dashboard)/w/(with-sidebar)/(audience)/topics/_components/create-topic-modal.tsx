"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as Select from "@kibamail/owly/select-field";
import * as Switch from "@kibamail/owly/switch";
import * as TextField from "@kibamail/owly/text-field";
import * as TextareaField from "@kibamail/owly/textarea-field";
import { useToast } from "@kibamail/owly/toast";
import type { Topic } from "@prisma/client";
import { Globe, Lock } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface TopicFormData {
  name: string;
  description: string;
  visibility: "PUBLIC" | "PRIVATE";
  defaultOptIn: boolean;
}

interface TopicModalProps extends ToggleState {
  topic?: Topic & { subscriberCount: number };
  mode?: "create" | "edit";
}

export function CreateTopicModal({
  open,
  onOpenChange,
  topic,
  mode = "create",
}: TopicModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const isEditMode = mode === "edit" && topic;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TopicFormData>({
    defaultValues: {
      name: "",
      description: "",
      visibility: "PUBLIC",
      defaultOptIn: false,
    },
  });

  useEffect(() => {
    if (isEditMode && topic) {
      setValue("name", topic.name);
      setValue("description", topic.description || "");
      setValue("visibility", topic.visibility);
      setValue("defaultOptIn", topic.defaultOptIn);
    } else if (!isEditMode) {
      reset({
        name: "",
        description: "",
        visibility: "PUBLIC",
        defaultOptIn: false,
      });
    }
  }, [isEditMode, topic, setValue, reset]);

  const mutation = useMutation<unknown, Error, TopicFormData>({
    async mutationFn(data: TopicFormData) {
      if (isEditMode && topic) {
        return internalApi.topics().update(topic.id, data);
      } else {
        return internalApi.topics().create(data);
      }
    },
    onSuccess() {
      toast(
        isEditMode
          ? "Topic updated successfully."
          : "Topic created successfully.",
      );
      onClose();
      router.refresh();
    },
  });

  function onClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: TopicFormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>
              {isEditMode ? "Edit Topic" : "Create New Topic"}
            </Dialog.Title>
            <Dialog.Description>
              {isEditMode
                ? "Update the topic details and subscriber preferences."
                : "Create a new topic to organize your content and manage subscriber preferences."}
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id="name"
              placeholder="Newsletter Updates"
              {...register("name", {
                required: "Topic name is required",
                maxLength: {
                  value: 100,
                  message: "Name must be 100 characters or less",
                },
              })}
            >
              <TextField.Label>Name</TextField.Label>
              {errors.name && (
                <TextField.Error>{errors.name.message}</TextField.Error>
              )}
            </TextField.Root>

            <TextareaField.Root
              id="description"
              placeholder="Optional description to help explain what this topic is about"
              rows={3}
              {...register("description", {
                maxLength: {
                  value: 500,
                  message: "Description must be 500 characters or less",
                },
              })}
            >
              <TextareaField.Label>Description</TextareaField.Label>
              {errors.description && (
                <TextareaField.Error>
                  {errors.description.message}
                </TextareaField.Error>
              )}
            </TextareaField.Root>

            <div className="space-y-2">
              <Select.Root
                value={watch("visibility")}
                onValueChange={(value) =>
                  setValue("visibility", value as "PUBLIC" | "PRIVATE")
                }
              >
                <Select.Label help="Public topics are visible to all contacts, while private topics are only visible to specific contacts you choose.">
                  Visibility
                </Select.Label>
                <Select.Trigger placeholder="Select visibility" />
                <Select.Content className="z-50">
                  <Select.Item value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Public</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Private</span>
                    </div>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div className="flex items-center justify-between">
              <Switch.Root
                id="defaultOptIn"
                checked={watch("defaultOptIn")}
                onCheckedChange={(checked) => setValue("defaultOptIn", checked)}
              >
                <Switch.Label
                  htmlFor="defaultOptIn"
                  help="When enabled, new contacts will be automatically subscribed to this topic. When disabled, contacts must manually opt in."
                >
                  Opt in by default
                </Switch.Label>
              </Switch.Root>
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
              {isEditMode ? "Update Topic" : "Create Topic"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
