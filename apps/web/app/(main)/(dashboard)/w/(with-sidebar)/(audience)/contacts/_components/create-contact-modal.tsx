"use client";

import { Button } from "@kibamail/owly/button";
import * as DateField from "@kibamail/owly/date-field";
import * as Dialog from "@kibamail/owly/dialog";
import * as MultiSelect from "@kibamail/owly/multi-select";
import * as Switch from "@kibamail/owly/switch";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import type { ContactStatus } from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface ContactFormData {
  email: string;
  topics: string[];
  subscribed: boolean;
  properties: Record<string, string | number | Date>;
}

interface CreateContactModalProps extends ToggleState {
  contactId?: string;
  mode?: "create" | "edit";
}

export function CreateContactModal({
  open,
  onOpenChange,
  contactId,
  mode = "create",
}: CreateContactModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success: toast } = useToast();
  const isEditMode = mode === "edit" && contactId;

  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      if (!contactId) return null;
      return internalApi.contacts().get(contactId);
    },
    enabled: !!isEditMode && open,
    staleTime: 0, // Always refetch when modal opens
  });

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const response = await internalApi.topics().list();
      return response.data;
    },
  });

  const { data: contactProperties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["contact-properties"],
    queryFn: async () => {
      const response = await internalApi.contactProperties().list();
      return response.data;
    },
  });

  const isLoading =
    topicsLoading || propertiesLoading || (isEditMode && contactLoading);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    defaultValues: {
      email: "",
      topics: [],
      subscribed: true,
      properties: {},
    },
  });

  useEffect(() => {
    if (isEditMode && contact) {
      setValue("email", contact.email);
      setValue("topics", contact.topics || []);
      setValue("subscribed", contact.status === "SUBSCRIBED");

      if (contact.properties) {
        const formProperties: Record<string, string | number | Date> = {};

        for (const [key, value] of Object.entries(contact.properties)) {
          formProperties[key] = value as string | number | Date;
        }

        setValue("properties", formProperties);
      }
    } else if (!isEditMode) {
      reset({
        email: "",
        topics: [],
        subscribed: true,
        properties: {},
      });
    }
  }, [isEditMode, contact, setValue, reset]);

  const mutation = useMutation<unknown, Error, ContactFormData>({
    async mutationFn(data: ContactFormData) {
      const properties: Record<string, string | number> = {};

      if (data.properties) {
        for (const [key, value] of Object.entries(data.properties)) {
          if (value instanceof Date) {
            properties[key] = value.getTime();
          } else if (value !== undefined && value !== null) {
            properties[key] = value;
          }
        }
      }

      const payload = {
        email: data.email,
        topics: data.topics,
        status: (data.subscribed
          ? "SUBSCRIBED"
          : "UNSUBSCRIBED") as ContactStatus,
        subscribedAt: data.subscribed ? new Date() : undefined,
        properties: Object.keys(properties).length > 0 ? properties : undefined,
      };

      if (isEditMode && contactId) {
        return internalApi.contacts().update(contactId, payload);
      } else {
        return internalApi.contacts().create(payload);
      }
    },
    onSuccess() {
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      }
      toast(
        isEditMode
          ? "Contact updated successfully."
          : "Contact created successfully.",
      );
      onClose();
      router.refresh();
    },
  });

  function onClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: ContactFormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>
              {isEditMode ? "Edit Contact" : "Create New Contact"}
            </Dialog.Title>
            <Dialog.Description>
              {isEditMode
                ? "Update the contact details and topic subscriptions."
                : "Add a new contact to your workspace and manage their topic subscriptions."}
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            {isEditMode && contactLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-kb-content-secondary">
                  Loading contact...
                </div>
              </div>
            ) : (
              <>
                <TextField.Root
                  id="email"
                  type="email"
                  placeholder="contact@example.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                >
                  <TextField.Label>Email</TextField.Label>
                  {errors.email && (
                    <TextField.Error>{errors.email.message}</TextField.Error>
                  )}
                </TextField.Root>

                {!topicsLoading && topics && (
                  <div className="space-y-2">
                    <Controller
                      name="topics"
                      control={control}
                      render={({ field }) => (
                        <MultiSelect.Root
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <MultiSelect.Label>Topics</MultiSelect.Label>
                          <MultiSelect.Trigger placeholder="Select topics to subscribe to" />
                          <MultiSelect.Content className="z-50">
                            {topics.map((topic) => (
                              <MultiSelect.Item key={topic.id} value={topic.id}>
                                {topic.name}
                              </MultiSelect.Item>
                            ))}
                          </MultiSelect.Content>
                        </MultiSelect.Root>
                      )}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Switch.Root
                    id="subscribed"
                    checked={watch("subscribed")}
                    onCheckedChange={(checked) =>
                      setValue("subscribed", checked)
                    }
                  >
                    <Switch.Label
                      htmlFor="subscribed"
                      help="When enabled, the contact will be marked as subscribed. When disabled, they will be unsubscribed."
                    >
                      Subscribed
                    </Switch.Label>
                  </Switch.Root>
                </div>

                {!propertiesLoading &&
                  contactProperties &&
                  contactProperties.length > 0 && (
                    <>
                      <div className="h-px bg-kb-bg-secondary" />
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium leading-none">
                            Contact Properties
                          </p>
                          <p className="text-sm text-kb-content-secondary mt-1">
                            Add custom property values for this contact
                          </p>
                        </div>

                        {contactProperties.map((property) => {
                          if (property.type === "DATE") {
                            return (
                              <Controller
                                key={property.name}
                                name={`properties.${property.name}`}
                                control={control}
                                render={({ field }) => (
                                  <DateField.Root
                                    value={
                                      field.value instanceof Date
                                        ? field.value
                                        : undefined
                                    }
                                    onValueChange={(date) =>
                                      field.onChange(date)
                                    }
                                    label={property.name}
                                    hint=""
                                  />
                                )}
                              />
                            );
                          }

                          if (property.type === "NUMBER") {
                            return (
                              <TextField.Root
                                key={property.name}
                                id={`property-${property.name}`}
                                type="number"
                                step="any"
                                placeholder="Enter a number"
                                {...register(`properties.${property.name}`, {
                                  valueAsNumber: true,
                                })}
                              >
                                <TextField.Label>
                                  {property.name}
                                </TextField.Label>
                              </TextField.Root>
                            );
                          }

                          return (
                            <TextField.Root
                              key={property.name}
                              id={`property-${property.name}`}
                              type="text"
                              placeholder="Enter a value"
                              {...register(`properties.${property.name}`)}
                            >
                              <TextField.Label>{property.name}</TextField.Label>
                            </TextField.Root>
                          );
                        })}
                      </div>
                    </>
                  )}
              </>
            )}
          </div>

          <Dialog.Footer className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading || mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || mutation.isPending}
              loading={mutation.isPending}
            >
              {isEditMode ? "Update Contact" : "Create Contact"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
