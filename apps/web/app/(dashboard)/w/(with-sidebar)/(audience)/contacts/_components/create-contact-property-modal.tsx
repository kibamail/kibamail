"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import * as SelectField from "@kibamail/owly/select-field";
import * as DateField from "@kibamail/owly/date-field";
import { useToast } from "@kibamail/owly/toast";
import {
  Calendar as CalendarIcon,
  Number0Square,
  Text as TextIcon,
} from "iconoir-react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import type { CreateContactPropertyRequest } from "@/app/api/v1/contact-properties/schema";
import type { ContactProperty } from "@prisma/client";
import { useEffect } from "react";

interface CreateContactPropertyFormData {
  name: string;
  type: "STRING" | "NUMBER" | "DATE";
  defaultValue: string | Date | null;
}

interface CreateContactPropertyModalProps extends ToggleState {
  property?: Pick<ContactProperty, "id" | "name" | "type" | "defaultValue">;
  mode?: "create" | "edit";
}

export function CreateContactPropertyModal({
  open,
  onOpenChange,
  property,
  mode = "create",
}: CreateContactPropertyModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const isEditMode = mode === "edit" && property;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateContactPropertyFormData>({
    defaultValues: {
      name: "",
      type: "STRING",
      defaultValue: null,
    },
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (isEditMode && property) {
      setValue("name", property.name);
      setValue("type", property.type);

      if (property.defaultValue) {
        if (property.type === "DATE") {
          const timestamp = parseInt(property.defaultValue, 10);
          setValue("defaultValue", new Date(timestamp));
        } else {
          setValue("defaultValue", property.defaultValue);
        }
      } else {
        setValue("defaultValue", null);
      }
    } else if (!isEditMode) {
      reset({
        name: "",
        type: "STRING",
        defaultValue: null,
      });
    }
  }, [isEditMode, property, setValue, reset]);

  const mutation = useMutation<unknown, Error, CreateContactPropertyRequest>({
    async mutationFn(data: CreateContactPropertyRequest) {
      if (isEditMode && property) {
        return internalApi.contactProperties().update(property.id, data);
      } else {
        return internalApi.contactProperties().create(data);
      }
    },
    onSuccess() {
      toast(
        isEditMode
          ? "Contact property updated successfully."
          : "Contact property created successfully."
      );
      handleClose();
      router.refresh();
    },
  });

  function handleClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: CreateContactPropertyFormData) {
    let defaultValue = data.defaultValue;

    if (data.type === "DATE" && defaultValue instanceof Date) {
      defaultValue = defaultValue.getTime().toString();
    }

    const payload: CreateContactPropertyRequest = {
      name: data.name,
      type: data.type,
      defaultValue: defaultValue as string | null,
    };

    mutation.mutate(payload);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content className="max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>
              {isEditMode ? "Edit Contact Property" : "Create Contact Property"}
            </Dialog.Title>
            <Dialog.Description>
              {isEditMode
                ? "Update the contact property details and default value."
                : "Add a new custom property to collect additional information about your contacts."}
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id="name"
              placeholder="Lead score"
              {...register("name", {
                required: "Property name is required",
                maxLength: {
                  value: 100,
                  message: "Name must be 100 characters or less",
                },
                pattern: {
                  value: /^[a-zA-Z0-9_\s-]+$/,
                  message:
                    "Name can only contain letters, numbers, spaces, hyphens, and underscores",
                },
              })}
            >
              <TextField.Label>Name</TextField.Label>
              {errors.name && (
                <TextField.Error>{errors.name.message}</TextField.Error>
              )}
            </TextField.Root>

            <Controller
              name="type"
              control={control}
              rules={{ required: "Property type is required" }}
              render={({ field }) => (
                <SelectField.Root
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);

                    setValue("defaultValue", null);
                  }}
                  disabled={!!isEditMode}
                >
                  <SelectField.Label>Type</SelectField.Label>
                  <SelectField.Trigger placeholder="Select property type" />
                  <SelectField.Content className="z-50">
                    <SelectField.Item value="STRING">
                      <div className="flex items-center gap-2">
                        <TextIcon className="w-4 h-4" />
                        <span>Text</span>
                      </div>
                    </SelectField.Item>
                    <SelectField.Item value="NUMBER">
                      <div className="flex items-center gap-2">
                        <Number0Square className="w-4 h-4" />
                        <span>Number</span>
                      </div>
                    </SelectField.Item>
                    <SelectField.Item value="DATE">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Date</span>
                      </div>
                    </SelectField.Item>
                  </SelectField.Content>

                  {errors.type?.message ? (
                    <SelectField.Error>
                      {errors.type?.message}
                    </SelectField.Error>
                  ) : null}
                </SelectField.Root>
              )}
            />

            <div className="space-y-2">
              {selectedType === "STRING" && (
                <TextField.Root
                  placeholder="Enter default text value"
                  {...register("defaultValue", {
                    maxLength: {
                      value: 255,
                      message: "Default value must be 255 characters or less",
                    },
                  })}
                >
                  <TextField.Label>Default value</TextField.Label>
                  {errors.defaultValue && (
                    <TextField.Error>
                      {errors.defaultValue.message}
                    </TextField.Error>
                  )}
                </TextField.Root>
              )}

              {selectedType === "NUMBER" && (
                <TextField.Root
                  type="number"
                  step="any"
                  placeholder="Enter default number value"
                  {...register("defaultValue", {
                    pattern: {
                      value: /^-?\d+(\.\d+)?$/,
                      message: "Must be a valid number",
                    },
                  })}
                >
                  <TextField.Label>Default value</TextField.Label>
                  {errors.defaultValue && (
                    <TextField.Error>
                      {errors.defaultValue.message}
                    </TextField.Error>
                  )}
                </TextField.Root>
              )}

              {selectedType === "DATE" && (
                <Controller
                  name="defaultValue"
                  control={control}
                  render={({ field }) => (
                    <DateField.Root
                      value={
                        field.value instanceof Date ? field.value : undefined
                      }
                      onValueChange={(date) => field.onChange(date)}
                      label="Default value"
                      hint=""
                    />
                  )}
                />
              )}
            </div>
          </div>

          <Dialog.Footer className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              loading={mutation.isPending}
            >
              {isEditMode ? "Update Property" : "Create Property"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
