"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import type { FilterBuilderFilter } from "@kibamail/owly/filter-builder";
import * as FilterBuilder from "@kibamail/owly/filter-builder";
import * as TextField from "@kibamail/owly/text-field";
import * as TextareaField from "@kibamail/owly/textarea-field";
import { useToast } from "@kibamail/owly/toast";
import type { Segment } from "@prisma/client";
import { Filter } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSegmentFieldDefinitions } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/segments/_hooks/use-segment-field-definitions";
import {
  convertConditionsToFilters,
  convertFiltersToConditions,
} from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/segments/_utils/filter-to-condition-converter";
import type { ConditionInput } from "@/app/(main)/api/v1/segments/schema";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface CreateSegmentFormData {
  name: string;
  description: string;
  filters: FilterBuilderFilter[];
}

interface CreateSegmentModalProps extends ToggleState {
  segment?: Pick<Segment, "id" | "name" | "description" | "conditions"> & {
    contactCount: number | null;
  };
  mode?: "create" | "edit";
}

export function CreateSegmentModal({
  open,
  onOpenChange,
  segment,
  mode = "create",
}: CreateSegmentModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const isEditMode = mode === "edit" && segment;
  const { fieldDefinitions, isLoading: fieldsLoading } =
    useSegmentFieldDefinitions();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateSegmentFormData>({
    defaultValues: {
      name: "",
      description: "",
      filters: [],
    },
  });

  useEffect(() => {
    if (isEditMode && segment) {
      setValue("name", segment.name);
      setValue("description", segment.description || "");
      const filters = convertConditionsToFilters(
        segment.conditions as ConditionInput,
      );
      setValue("filters", filters);
    } else if (!isEditMode) {
      reset({
        name: "",
        description: "",
        filters: [],
      });
    }
  }, [isEditMode, segment, setValue, reset]);

  const mutation = useMutation<unknown, Error, CreateSegmentFormData>({
    async mutationFn(data: CreateSegmentFormData) {
      const conditions = convertFiltersToConditions(data.filters);

      if (isEditMode && segment) {
        return internalApi.segments().update(segment.id, {
          name: data.name,
          description: data.description || null,
          conditions,
        });
      } else {
        return internalApi.segments().create({
          name: data.name,
          description: data.description || null,
          conditions,
        });
      }
    },
    onSuccess() {
      toast(
        isEditMode
          ? "Segment updated successfully."
          : "Segment created successfully.",
      );
      onClose();
      router.refresh();
    },
  });

  function onClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: CreateSegmentFormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content className="max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>
              {isEditMode ? "Edit Segment" : "Create New Segment"}
            </Dialog.Title>
            <Dialog.Description>
              {isEditMode
                ? "Update the segment details and filtering criteria."
                : "Create a new segment to group contacts based on specific criteria and conditions."}
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id="name"
              placeholder="High-value customers"
              {...register("name", {
                required: "Segment name is required",
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
              placeholder="Customers with high lifetime value and recent activity"
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
              <p className="text-sm font-medium leading-none">Filters</p>
              <p className="text-sm text-kb-content-secondary">
                Define the criteria that contacts must meet to be included in
                this segment
              </p>

              {!fieldsLoading && fieldDefinitions && (
                <Controller
                  name="filters"
                  control={control}
                  render={({ field }) => (
                    <FilterBuilder.Root
                      fields={fieldDefinitions}
                      filters={field.value}
                      onChange={field.onChange}
                      maxFilters={10}
                      className="align-left"
                    >
                      <FilterBuilder.Trigger
                        asChild
                        className="flex justify-start mb-2"
                      >
                        <Button variant="secondary" size="xs" type="button">
                          <Filter />
                          Add filter
                        </Button>
                      </FilterBuilder.Trigger>
                      <FilterBuilder.Filters />
                    </FilterBuilder.Root>
                  )}
                />
              )}
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
              disabled={mutation.isPending || fieldsLoading}
              loading={mutation.isPending}
            >
              {isEditMode ? "Update Segment" : "Create Segment"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
