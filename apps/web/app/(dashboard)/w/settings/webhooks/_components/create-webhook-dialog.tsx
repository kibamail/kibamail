"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@kibamail/owly/button";
import { Checkbox } from "@kibamail/owly/checkbox";
import * as Dialog from "@kibamail/owly/dialog";
import * as Select from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import type { WebhookDestinationType } from "@/webhooks/client/types";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

interface CreateWebhookFormData {
  destination_type: string;
  credentials: Record<string, string | boolean>;
  config: Record<string, string | boolean>;
  topics: string[];
}

interface CreateWebhookDialogProps extends ToggleState {
  destinationTypes: WebhookDestinationType[];
  topics: string[];
}

export function CreateWebhookDialog({
  open,
  onOpenChange,
  destinationTypes,
  topics,
}: CreateWebhookDialogProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const [selectedDestinationType, setSelectedDestinationType] =
    useState<WebhookDestinationType | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateWebhookFormData>({
    defaultValues: {
      destination_type: destinationTypes[0]?.type || "",
      credentials: {},
      config: {},
      topics: [],
    },
  });

  const destinationType = watch("destination_type");

  useEffect(() => {
    if (destinationTypes.length > 0 && !destinationType) {
      setValue("destination_type", destinationTypes[0].type || "");
    }
  }, [destinationTypes, destinationType, setValue]);

  useEffect(() => {
    const selected = destinationTypes.find((dt) => dt.type === destinationType);
    setSelectedDestinationType(selected || null);

    setValue("credentials", {});
    setValue("config", {});
  }, [destinationType, destinationTypes, setValue]);

  const createMutation = useMutation<unknown, Error, CreateWebhookFormData>({
    async mutationFn(data: CreateWebhookFormData) {
      return internalApi.webhooks().create({
        type: data.destination_type,
        credentials: data.credentials,
        config: data.config,
        topics: data.topics,
      });
    },
    setError,
    onSuccess() {
      toast("Webhook destination created successfully.");
      handleClose();
      router.refresh();
    },
  });

  function handleClose() {
    reset();
    setSelectedDestinationType(null);
    onOpenChange?.(false);
  }

  function onSubmit(data: CreateWebhookFormData) {
    createMutation.mutate(data);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content className="max-w-2xl lg:max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>Create Webhook</Dialog.Title>
            <Dialog.Description>
              Configure a new webhook destination to receive events.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <div className="space-y-2">
              <Controller
                name="destination_type"
                control={control}
                rules={{ required: "Destination type is required" }}
                render={({ field }) => (
                  <Select.Root
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <Select.Label>Webhook destination</Select.Label>
                    <Select.Trigger placeholder="Send webhooks to" />
                    <Select.Content className="z-50">
                      {destinationTypes.map((destinationType) => (
                        <Select.Item
                          key={destinationType.type}
                          value={destinationType.type || ""}
                        >
                          <span
                            dangerouslySetInnerHTML={{
                              __html: destinationType.icon as string,
                            }}
                            className="w-5 h-5 rounded-sm"
                          />
                          {destinationType.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              />
              {errors.destination_type && (
                <p className="text-sm text-kb-content-negative">
                  {errors.destination_type.message}
                </p>
              )}
            </div>

            {selectedDestinationType?.description && (
              <p className="text-sm text-kb-content-tertiary -mt-5">
                {selectedDestinationType.description}
              </p>
            )}

            {selectedDestinationType?.credential_fields &&
              selectedDestinationType.credential_fields.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    {selectedDestinationType?.label} credentials
                  </h4>
                  {selectedDestinationType.credential_fields.map(
                    (field, index) => {
                      const fieldKey = field.key || `field_${index}`;
                      const fieldName = `credentials.${fieldKey}` as const;

                      if (field.type === "checkbox") {
                        return (
                          <div key={fieldKey} className="space-y-2">
                            <Controller
                              name={fieldName}
                              control={control}
                              rules={{
                                required: field.required
                                  ? `${field.label} is required`
                                  : false,
                              }}
                              render={({ field: controllerField }) => (
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={fieldKey}
                                    checked={
                                      typeof controllerField.value === "boolean"
                                        ? controllerField.value
                                        : false
                                    }
                                    onCheckedChange={controllerField.onChange}
                                  />
                                  <label
                                    htmlFor={fieldKey}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {field.label}
                                    {field.required && (
                                      <span className="text-kb-content-negative ml-1">
                                        *
                                      </span>
                                    )}
                                  </label>
                                </div>
                              )}
                            />
                            {field.description && (
                              <p className="text-xs text-kb-content-tertiary ml-8">
                                {field.description}
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={fieldKey}>
                          <Controller
                            name={fieldName}
                            control={control}
                            rules={{
                              required: field.required
                                ? `${field.label} is required`
                                : false,
                              minLength: field.minlength
                                ? {
                                    value: field.minlength,
                                    message: `Minimum length is ${field.minlength}`,
                                  }
                                : undefined,
                              maxLength: field.maxlength
                                ? {
                                    value: field.maxlength,
                                    message: `Maximum length is ${field.maxlength}`,
                                  }
                                : undefined,
                              pattern: field.pattern
                                ? {
                                    value: new RegExp(field.pattern),
                                    message: "Invalid format",
                                  }
                                : undefined,
                            }}
                            render={({ field: controllerField }) => (
                              <TextField.Root
                                id={fieldKey}
                                type={field.sensitive ? "password" : "text"}
                                placeholder={field.default}
                                value={
                                  typeof controllerField.value === "string"
                                    ? controllerField.value
                                    : ""
                                }
                                onChange={controllerField.onChange}
                                onBlur={controllerField.onBlur}
                                name={controllerField.name}
                              >
                                <TextField.Label>
                                  {field.label}
                                  {field.required && (
                                    <span className="text-kb-content-negative ml-1">
                                      *
                                    </span>
                                  )}
                                </TextField.Label>
                                {field.description && (
                                  <TextField.Hint>
                                    {field.description}
                                  </TextField.Hint>
                                )}
                                {errors.credentials?.[fieldKey] && (
                                  <TextField.Error>
                                    {
                                      errors.credentials[fieldKey]
                                        ?.message as string
                                    }
                                  </TextField.Error>
                                )}
                              </TextField.Root>
                            )}
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              )}

            {selectedDestinationType?.config_fields &&
              selectedDestinationType.config_fields.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    {selectedDestinationType?.label} configuration
                  </h4>
                  {selectedDestinationType.config_fields.map((field, index) => {
                    const fieldKey = field.key || `field_${index}`;
                    const fieldName = `config.${fieldKey}` as const;

                    if (field.type === "checkbox") {
                      return (
                        <div key={fieldKey} className="space-y-2">
                          <Controller
                            name={fieldName}
                            control={control}
                            rules={{
                              required: field.required
                                ? `${field.label} is required`
                                : false,
                            }}
                            render={({ field: controllerField }) => (
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={fieldKey}
                                  checked={
                                    typeof controllerField.value === "boolean"
                                      ? controllerField.value
                                      : false
                                  }
                                  onCheckedChange={controllerField.onChange}
                                />
                                <label
                                  htmlFor={fieldKey}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {field.label}
                                  {field.required && (
                                    <span className="text-kb-content-negative ml-1">
                                      *
                                    </span>
                                  )}
                                </label>
                              </div>
                            )}
                          />
                          {field.description && (
                            <p className="text-xs text-gray-500 ml-8">
                              {field.description}
                            </p>
                          )}
                        </div>
                      );
                    }

                    // Text field
                    return (
                      <div key={fieldKey}>
                        <Controller
                          name={fieldName}
                          control={control}
                          rules={{
                            required: field.required
                              ? `${field.label} is required`
                              : false,
                            minLength: field.minlength
                              ? {
                                  value: field.minlength,
                                  message: `Minimum length is ${field.minlength}`,
                                }
                              : undefined,
                            maxLength: field.maxlength
                              ? {
                                  value: field.maxlength,
                                  message: `Maximum length is ${field.maxlength}`,
                                }
                              : undefined,
                            pattern: field.pattern
                              ? {
                                  value: new RegExp(field.pattern),
                                  message: "Invalid format",
                                }
                              : undefined,
                          }}
                          render={({ field: controllerField }) => (
                            <TextField.Root
                              id={fieldKey}
                              type={field.sensitive ? "password" : "text"}
                              placeholder={field.default}
                              value={
                                typeof controllerField.value === "string"
                                  ? controllerField.value
                                  : ""
                              }
                              onChange={controllerField.onChange}
                              onBlur={controllerField.onBlur}
                              name={controllerField.name}
                            >
                              <TextField.Label>
                                {field.label}
                                {field.required && (
                                  <span className="text-kb-content-negative ml-1">
                                    *
                                  </span>
                                )}
                              </TextField.Label>
                              {field.description && (
                                <TextField.Hint>
                                  {field.description}
                                </TextField.Hint>
                              )}
                              {errors.config?.[fieldKey] && (
                                <TextField.Error>
                                  {errors.config[fieldKey]?.message as string}
                                </TextField.Error>
                              )}
                            </TextField.Root>
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

            {topics.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-kb-content-secondary">
                    Event Topics
                  </h4>
                  <p className="text-xs text-kb-content-tertiary mt-1">
                    Select the events you want to receive webhooks for
                  </p>
                </div>
                <Controller
                  name="topics"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {topics.map((topic) => (
                        <div key={topic} className="flex items-center gap-2">
                          <Checkbox
                            id={`topic-${topic}`}
                            checked={field.value?.includes(topic)}
                            onCheckedChange={(checked) => {
                              const currentTopics = field.value || [];
                              if (checked) {
                                field.onChange([...currentTopics, topic]);
                              } else {
                                field.onChange(
                                  currentTopics.filter((t) => t !== topic)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`topic-${topic}`}
                            className="text-sm cursor-pointer"
                          >
                            {topic}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                />
                {errors.topics && (
                  <p className="text-sm text-kb-content-negative">
                    {errors.topics.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <Dialog.Footer className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              loading={createMutation.isPending}
            >
              Create Webhook
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
