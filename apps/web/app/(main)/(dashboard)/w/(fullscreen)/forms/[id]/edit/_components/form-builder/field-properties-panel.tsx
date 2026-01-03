"use client";

import { SelectField } from "@kibamail/owly";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Globe,
  Hashtag,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  Text as TextIcon,
  Trash,
  Xmark,
} from "iconoir-react";
import { internalApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { SUBMIT_BUTTON_ID, useFormBuilder } from "./form-builder-context";
import {
  type ButtonPosition,
  type ButtonSize,
  type ButtonVariant,
  type ContactPropertyMapping,
  FIELD_TYPE_CONFIGS,
  type FieldWidth,
  type LabelPosition,
  STANDARD_CONTACT_PROPERTIES,
} from "./types";

// Standard contact property display info
const STANDARD_PROPERTY_INFO: Record<
  string,
  { name: string; icon: React.ComponentType<{ className?: string }> }
> = {
  email: { name: "Email address", icon: Mail },
  firstName: { name: "First name", icon: TextIcon },
  lastName: { name: "Last name", icon: TextIcon },
  phone: { name: "Phone", icon: Phone },
  country: { name: "Country", icon: Globe },
  timezone: { name: "Timezone", icon: Clock },
  city: { name: "City", icon: MapPin },
};

// Map database property types to icons
function getPropertyIcon(
  dbType: string,
): React.ComponentType<{ className?: string }> {
  switch (dbType) {
    case "DATE":
      return Calendar;
    case "NUMBER":
      return Hashtag;
    default:
      return TextIcon;
  }
}

// Field types that don't require contact property mapping (presentational fields)
const PRESENTATION_FIELD_TYPES = ["content", "hidden"] as const;

export function FieldPropertiesPanel() {
  const {
    schema,
    selectedField,
    selectedFieldId,
    getFieldLocation,
    updateField,
    updateSubmitButton,
    clearSelection,
    addFieldOption,
    removeFieldOption,
    updateFieldOption,
  } = useFormBuilder();

  // Fetch custom contact properties
  const { data: customProperties } = useQuery({
    queryKey: ["contact-properties"],
    queryFn: async () => {
      const response = await internalApi.contactProperties().list();
      return response.data;
    },
  });

  // Check if submit button is selected
  const isSubmitButtonSelected = selectedFieldId === SUBMIT_BUTTON_ID;

  if (!isSubmitButtonSelected && (!selectedField || !selectedFieldId)) {
    return null;
  }

  // Render submit button properties
  if (isSubmitButtonSelected) {
    const submitButton = schema.settings.submitButton;
    return (
      <div className="w-[320px] h-full bg-kb-surface-secondary border-l border-kb-border-tertiary flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-kb-border-tertiary flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-kb-content-primary">
              Submit Button
            </h2>
            <p className="text-xs text-kb-content-tertiary mt-0.5">
              Form submission button
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="p-1.5 rounded-md hover:bg-kb-surface-tertiary text-kb-content-tertiary hover:text-kb-content-primary transition-colors"
          >
            <Xmark className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Basic Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
              Basic Settings
            </h3>

            {/* Label */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-kb-content-primary">
                Label
              </label>
              <input
                type="text"
                value={submitButton.text}
                onChange={(event) =>
                  updateSubmitButton({ text: event.target.value })
                }
                className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
              />
            </div>

            {/* Loading Text */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-kb-content-primary">
                Loading Text
              </label>
              <input
                type="text"
                value={submitButton.loadingText}
                onChange={(event) =>
                  updateSubmitButton({ loadingText: event.target.value })
                }
                placeholder="Submitting..."
                className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
              Appearance
            </h3>

            {/* Full Width */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={submitButton.fullWidth}
                onChange={(event) =>
                  updateSubmitButton({ fullWidth: event.target.checked })
                }
                className="w-4 h-4 rounded border-kb-border-secondary text-kb-primary focus:ring-kb-primary/20"
              />
              <span className="text-sm text-kb-content-primary">
                Full width
              </span>
            </label>

            {/* Position */}
            {!submitButton.fullWidth && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-kb-content-primary">
                  Position
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(["left", "center", "right"] as ButtonPosition[]).map(
                    (position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() => updateSubmitButton({ position })}
                        className={cn(
                          "px-2 py-1.5 rounded text-xs font-medium capitalize transition-colors",
                          submitButton.position === position
                            ? "bg-kb-primary text-white"
                            : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary",
                        )}
                      >
                        {position}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Variant */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-kb-content-primary">
                Style
              </label>
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    "default",
                    "secondary",
                    "outline",
                    "ghost",
                  ] as ButtonVariant[]
                ).map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => updateSubmitButton({ variant })}
                    className={cn(
                      "px-2 py-1.5 rounded text-xs font-medium capitalize transition-colors",
                      submitButton.variant === variant
                        ? "bg-kb-primary text-white"
                        : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary",
                    )}
                  >
                    {variant}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-kb-content-primary">
                Size
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["sm", "default", "lg"] as ButtonSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateSubmitButton({ size })}
                    className={cn(
                      "px-2 py-1.5 rounded text-xs font-medium transition-colors",
                      submitButton.size === size
                        ? "bg-kb-primary text-white"
                        : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary",
                    )}
                  >
                    {size === "sm"
                      ? "Small"
                      : size === "default"
                        ? "Medium"
                        : "Large"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const location = getFieldLocation(selectedFieldId!);
  if (!location) return null;

  const { pageIndex, sectionId } = location;
  const field = selectedField!;
  const fieldConfig = FIELD_TYPE_CONFIGS[field.type];

  function onUpdate(updates: Parameters<typeof updateField>[3]) {
    updateField(pageIndex, sectionId, selectedFieldId!, updates);
  }

  return (
    <div className="w-[320px] h-full bg-kb-surface-secondary border-l border-kb-border-tertiary flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-kb-border-tertiary flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-kb-content-primary">
            Field Properties
          </h2>
          <p className="text-xs text-kb-content-tertiary mt-0.5">
            {fieldConfig.label}
          </p>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="p-1.5 rounded-md hover:bg-kb-surface-tertiary text-kb-content-tertiary hover:text-kb-content-primary transition-colors"
        >
          <Xmark className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Basic Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
            Basic Settings
          </h3>

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-kb-content-primary">
              Label
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(event) => onUpdate({ label: event.target.value })}
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
            />
          </div>

          {/* Field Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-kb-content-primary">
              Field Name
            </label>
            <input
              type="text"
              value={field.name}
              onChange={(event) => onUpdate({ name: event.target.value })}
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
            />
            <p className="text-xs text-kb-content-tertiary">
              Used for data submission
            </p>
          </div>

          {/* Placeholder */}
          {fieldConfig.supportsPlaceholder && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-kb-content-primary">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder ?? ""}
                onChange={(event) =>
                  onUpdate({ placeholder: event.target.value })
                }
                placeholder="Enter placeholder text..."
                className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-kb-content-primary">
              Description
            </label>
            <textarea
              value={field.description ?? ""}
              onChange={(event) =>
                onUpdate({ description: event.target.value })
              }
              placeholder="Help text for users..."
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
            />
          </div>
        </div>

        {/* Options (for select, radio, etc.) */}
        {fieldConfig.supportsOptions && field.options && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
                Options
              </h3>
              <button
                type="button"
                onClick={() =>
                  addFieldOption(pageIndex, sectionId, selectedFieldId)
                }
                className="p-1 rounded-md hover:bg-kb-surface-tertiary text-kb-content-tertiary hover:text-kb-content-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {field.options.map((option, index) => (
                <div
                  key={option.id}
                  className="flex items-start gap-2 p-2 rounded-md bg-kb-surface-primary border border-kb-border-tertiary"
                >
                  <div className="pt-2 cursor-grab text-kb-content-tertiary">
                    <Menu className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(event) =>
                        updateFieldOption(
                          pageIndex,
                          sectionId,
                          selectedFieldId,
                          option.id,
                          { label: event.target.value },
                        )
                      }
                      placeholder="Label"
                      className="w-full px-2 py-1.5 rounded border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-primary text-sm focus:outline-none focus:ring-1 focus:ring-kb-primary/20 focus:border-kb-primary"
                    />
                    <input
                      type="text"
                      value={option.value}
                      onChange={(event) =>
                        updateFieldOption(
                          pageIndex,
                          sectionId,
                          selectedFieldId,
                          option.id,
                          { value: event.target.value },
                        )
                      }
                      placeholder="Value"
                      className="w-full px-2 py-1.5 rounded border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-kb-primary/20 focus:border-kb-primary"
                    />
                    {field.type === "choice_card" && (
                      <input
                        type="text"
                        value={option.description ?? ""}
                        onChange={(event) =>
                          updateFieldOption(
                            pageIndex,
                            sectionId,
                            selectedFieldId,
                            option.id,
                            { description: event.target.value },
                          )
                        }
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1.5 rounded border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-primary text-sm focus:outline-none focus:ring-1 focus:ring-kb-primary/20 focus:border-kb-primary"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      removeFieldOption(
                        pageIndex,
                        sectionId,
                        selectedFieldId,
                        option.id,
                      )
                    }
                    disabled={(field.options?.length ?? 0) <= 1}
                    className="pt-2 p-1 rounded-md hover:bg-red-50 text-kb-content-tertiary hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-kb-content-tertiary"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
            Validation
          </h3>

          {/* Required */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={field.validation?.required ?? false}
              onChange={(event) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    required: event.target.checked,
                  },
                })
              }
              className="w-4 h-4 rounded border-kb-border-secondary text-kb-primary focus:ring-kb-primary/20"
            />
            <span className="text-sm text-kb-content-primary">
              Required field
            </span>
          </label>

          {/* Required Message */}
          {field.validation?.required && (
            <div className="space-y-1.5 ml-7">
              <label className="text-sm font-medium text-kb-content-primary">
                Error Message
              </label>
              <input
                type="text"
                value={field.validation?.requiredMessage ?? ""}
                onChange={(event) =>
                  onUpdate({
                    validation: {
                      ...field.validation,
                      requiredMessage: event.target.value,
                    },
                  })
                }
                placeholder="This field is required"
                className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
              />
            </div>
          )}
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
            Appearance
          </h3>

          {/* Width */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-kb-content-primary">
              Width
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(["full", "half", "third", "quarter"] as FieldWidth[]).map(
                (width) => (
                  <button
                    key={width}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        appearance: { ...field.appearance, width },
                      })
                    }
                    className={cn(
                      "px-2 py-1.5 rounded text-xs font-medium transition-colors",
                      field.appearance.width === width
                        ? "bg-kb-primary text-white"
                        : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary",
                    )}
                  >
                    {width === "full"
                      ? "Full"
                      : width === "half"
                        ? "1/2"
                        : width === "third"
                          ? "1/3"
                          : "1/4"}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Label Position */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-kb-content-primary">
              Label Position
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["top", "left", "hidden"] as LabelPosition[]).map(
                (position) => (
                  <button
                    key={position}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        appearance: {
                          ...field.appearance,
                          labelPosition: position,
                        },
                      })
                    }
                    className={cn(
                      "px-2 py-1.5 rounded text-xs font-medium capitalize transition-colors",
                      field.appearance.labelPosition === position
                        ? "bg-kb-primary text-white"
                        : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary",
                    )}
                  >
                    {position}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Contact Property Mapping - only for input fields, not presentation fields */}
        {!PRESENTATION_FIELD_TYPES.includes(
          field.type as (typeof PRESENTATION_FIELD_TYPES)[number],
        ) && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
              Contact Property
            </h3>
            <p className="text-xs text-kb-content-tertiary">
              Map this field to a contact property to save submission data
            </p>

            <SelectField.Root
              value={field.contactProperty?.id ?? "__none__"}
              onValueChange={(value) => {
                if (value === "__none__") {
                  onUpdate({ contactProperty: undefined });
                  return;
                }

                // Check if it's a standard property
                const isStandard = STANDARD_CONTACT_PROPERTIES.includes(
                  value as (typeof STANDARD_CONTACT_PROPERTIES)[number],
                );

                if (isStandard) {
                  const propInfo = STANDARD_PROPERTY_INFO[value];
                  onUpdate({
                    contactProperty: {
                      type: "standard",
                      id: value,
                      name: propInfo?.name ?? value,
                    },
                  });
                } else {
                  // It's a custom property
                  const customProp = customProperties?.find(
                    (p) => p.id === value,
                  );
                  if (customProp) {
                    onUpdate({
                      contactProperty: {
                        type: "custom",
                        id: customProp.id,
                        name: customProp.name,
                      },
                    });
                  }
                }
              }}
            >
              <SelectField.Trigger placeholder="Select contact property..." />
              <SelectField.Content className="z-50">
                <SelectField.Item value="__none__">
                  None - Don't save
                </SelectField.Item>
                <SelectField.Separator />

                {/* Standard Properties */}
                {STANDARD_CONTACT_PROPERTIES.map((propId) => {
                  const propInfo = STANDARD_PROPERTY_INFO[propId];
                  const Icon = propInfo.icon;
                  return (
                    <SelectField.Item key={propId} value={propId}>
                      <Icon className="w-4 h-4" />
                      {propInfo.name}
                    </SelectField.Item>
                  );
                })}

                {/* Custom Properties */}
                {customProperties && customProperties.length > 0 && (
                  <>
                    <SelectField.Separator />
                    {customProperties.map((prop) => {
                      const Icon = getPropertyIcon(prop.type);
                      return (
                        <SelectField.Item key={prop.id} value={prop.id}>
                          <Icon className="w-4 h-4" />
                          {prop.name}
                        </SelectField.Item>
                      );
                    })}
                  </>
                )}
              </SelectField.Content>

              {!field.contactProperty && (
                <SelectField.Hint>
                  Required for form publishing
                </SelectField.Hint>
              )}
            </SelectField.Root>

            {field.contactProperty && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-kb-surface-primary border border-kb-border-tertiary">
                {field.contactProperty.type === "standard"
                  ? (() => {
                      const Icon =
                        STANDARD_PROPERTY_INFO[field.contactProperty.id]
                          ?.icon ?? TextIcon;
                      return (
                        <Icon className="w-4 h-4 text-kb-content-secondary" />
                      );
                    })()
                  : (() => {
                      const customProp = customProperties?.find(
                        (p) => p.id === field.contactProperty?.id,
                      );
                      const Icon = customProp
                        ? getPropertyIcon(customProp.type)
                        : TextIcon;
                      return (
                        <Icon className="w-4 h-4 text-kb-content-secondary" />
                      );
                    })()}
                <span className="text-sm text-kb-content-primary">
                  {field.contactProperty.name}
                </span>
                <span className="text-xs text-kb-content-tertiary ml-auto">
                  {field.contactProperty.type === "standard"
                    ? "Built-in"
                    : "Custom"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
