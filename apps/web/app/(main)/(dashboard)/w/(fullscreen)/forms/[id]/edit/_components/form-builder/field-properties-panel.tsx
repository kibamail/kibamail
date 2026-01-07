"use client";

import {
  Checkbox,
  SelectField,
  TextField,
  TextareaField,
} from "@kibamail/owly";
import { Button } from "@kibamail/owly/button";
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
import { SUBMIT_BUTTON_ID, useFormBuilder } from "./form-builder-context";
import {
  type ButtonPosition,
  type ButtonSize,
  type ButtonVariant,
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

// Section header component for consistency
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
      {children}
    </h3>
  );
}

// Panel header component
function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="p-4 border-b border-kb-border-tertiary flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold text-kb-content-primary">
          {title}
        </h2>
        <p className="text-xs text-kb-content-tertiary mt-0.5">{subtitle}</p>
      </div>
      <Button variant="tertiary" size="sm" onClick={onClose}>
        <Xmark className="w-4 h-4" />
      </Button>
    </div>
  );
}

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
        <PanelHeader
          title="Submit Button"
          subtitle="Form submission button"
          onClose={clearSelection}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <SectionHeader>Basic Settings</SectionHeader>

            <TextField.Root
              value={submitButton.text}
              onChange={(event) =>
                updateSubmitButton({ text: event.target.value })
              }
            >
              <TextField.Label>Label</TextField.Label>
            </TextField.Root>

            <TextField.Root
              value={submitButton.loadingText}
              onChange={(event) =>
                updateSubmitButton({ loadingText: event.target.value })
              }
              placeholder="Submitting..."
            >
              <TextField.Label>Loading Text</TextField.Label>
              <TextField.Hint>
                Text shown while form is being submitted
              </TextField.Hint>
            </TextField.Root>
          </div>

          {/* Appearance */}
          <div className="space-y-4">
            <SectionHeader>Appearance</SectionHeader>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={submitButton.fullWidth}
                onCheckedChange={(checked) =>
                  updateSubmitButton({ fullWidth: checked === true })
                }
              />
              <span className="text-sm text-kb-content-primary">Full width</span>
            </label>

            {!submitButton.fullWidth && (
              <SelectField.Root
                value={submitButton.position}
                onValueChange={(value) =>
                  updateSubmitButton({ position: value as ButtonPosition })
                }
              >
                <SelectField.Label>Position</SelectField.Label>
                <SelectField.Trigger placeholder="Select position" />
                <SelectField.Content>
                  <SelectField.Item value="left">Left</SelectField.Item>
                  <SelectField.Item value="center">Center</SelectField.Item>
                  <SelectField.Item value="right">Right</SelectField.Item>
                </SelectField.Content>
              </SelectField.Root>
            )}

            <SelectField.Root
              value={submitButton.variant}
              onValueChange={(value) =>
                updateSubmitButton({ variant: value as ButtonVariant })
              }
            >
              <SelectField.Label>Style</SelectField.Label>
              <SelectField.Trigger placeholder="Select style" />
              <SelectField.Content>
                <SelectField.Item value="default">Default</SelectField.Item>
                <SelectField.Item value="secondary">Secondary</SelectField.Item>
                <SelectField.Item value="outline">Outline</SelectField.Item>
                <SelectField.Item value="ghost">Ghost</SelectField.Item>
              </SelectField.Content>
            </SelectField.Root>

            <SelectField.Root
              value={submitButton.size}
              onValueChange={(value) =>
                updateSubmitButton({ size: value as ButtonSize })
              }
            >
              <SelectField.Label>Size</SelectField.Label>
              <SelectField.Trigger placeholder="Select size" />
              <SelectField.Content>
                <SelectField.Item value="sm">Small</SelectField.Item>
                <SelectField.Item value="default">Medium</SelectField.Item>
                <SelectField.Item value="lg">Large</SelectField.Item>
              </SelectField.Content>
            </SelectField.Root>
          </div>
        </div>
      </div>
    );
  }

  const location = getFieldLocation(selectedFieldId as string);
  if (!location) return null;

  const { pageIndex, sectionId } = location;
  const field = selectedField as NonNullable<typeof selectedField>;
  const fieldConfig = FIELD_TYPE_CONFIGS[field.type];

  function onUpdate(updates: Parameters<typeof updateField>[3]) {
    updateField(pageIndex, sectionId, selectedFieldId as string, updates);
  }

  return (
    <div className="w-[320px] h-full bg-kb-surface-secondary border-l border-kb-border-tertiary flex flex-col shrink-0">
      <PanelHeader
        title="Field Properties"
        subtitle={fieldConfig.label}
        onClose={clearSelection}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <SectionHeader>Basic Settings</SectionHeader>

          <TextField.Root
            value={field.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
          >
            <TextField.Label>Label</TextField.Label>
          </TextField.Root>

          <TextField.Root
            value={field.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            className="font-mono"
          >
            <TextField.Label>Field Name</TextField.Label>
            <TextField.Hint>Used for data submission</TextField.Hint>
          </TextField.Root>

          {fieldConfig.supportsPlaceholder && (
            <TextField.Root
              value={field.placeholder ?? ""}
              onChange={(event) => onUpdate({ placeholder: event.target.value })}
              placeholder="Enter placeholder text..."
            >
              <TextField.Label>Placeholder</TextField.Label>
            </TextField.Root>
          )}

          <TextareaField.Root
            value={field.description ?? ""}
            onChange={(event) => onUpdate({ description: event.target.value })}
            placeholder="Help text for users..."
            rows={2}
          >
            <TextareaField.Label>Description</TextareaField.Label>
          </TextareaField.Root>
        </div>

        {/* Options (for select, radio, etc.) */}
        {fieldConfig.supportsOptions && field.options && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader>Options</SectionHeader>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() =>
                  addFieldOption(pageIndex, sectionId, selectedFieldId)
                }
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {field.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-start gap-2 p-3 rounded-lg bg-kb-surface-primary border border-kb-border-tertiary"
                >
                  <div className="pt-2 cursor-grab text-kb-content-tertiary">
                    <Menu className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <TextField.Root
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
                    />
                    <TextField.Root
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
                      className="font-mono"
                    />
                    {field.type === "choice_card" && (
                      <TextField.Root
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
                      />
                    )}
                  </div>
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={() =>
                      removeFieldOption(
                        pageIndex,
                        sectionId,
                        selectedFieldId,
                        option.id,
                      )
                    }
                    disabled={(field.options?.length ?? 0) <= 1}
                    className="text-kb-content-tertiary hover:text-kb-content-negative"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation */}
        <div className="space-y-4">
          <SectionHeader>Validation</SectionHeader>

          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={field.validation?.required ?? false}
              onCheckedChange={(checked) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    required: checked === true,
                  },
                })
              }
            />
            <span className="text-sm text-kb-content-primary">
              Required field
            </span>
          </label>

          {field.validation?.required && (
            <div className="ml-7">
              <TextField.Root
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
              >
                <TextField.Label>Error Message</TextField.Label>
              </TextField.Root>
            </div>
          )}
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <SectionHeader>Appearance</SectionHeader>

          <SelectField.Root
            value={field.appearance.width}
            onValueChange={(value) =>
              onUpdate({
                appearance: { ...field.appearance, width: value as FieldWidth },
              })
            }
          >
            <SelectField.Label>Width</SelectField.Label>
            <SelectField.Trigger placeholder="Select width" />
            <SelectField.Content>
              <SelectField.Item value="full">Full</SelectField.Item>
              <SelectField.Item value="half">Half (1/2)</SelectField.Item>
              <SelectField.Item value="third">Third (1/3)</SelectField.Item>
              <SelectField.Item value="quarter">Quarter (1/4)</SelectField.Item>
            </SelectField.Content>
          </SelectField.Root>

          <SelectField.Root
            value={field.appearance.labelPosition}
            onValueChange={(value) =>
              onUpdate({
                appearance: {
                  ...field.appearance,
                  labelPosition: value as LabelPosition,
                },
              })
            }
          >
            <SelectField.Label>Label Position</SelectField.Label>
            <SelectField.Trigger placeholder="Select position" />
            <SelectField.Content>
              <SelectField.Item value="top">Top</SelectField.Item>
              <SelectField.Item value="left">Left</SelectField.Item>
              <SelectField.Item value="hidden">Hidden</SelectField.Item>
            </SelectField.Content>
          </SelectField.Root>
        </div>

        {/* Contact Property Mapping - only for input fields, not presentation fields */}
        {!PRESENTATION_FIELD_TYPES.includes(
          field.type as (typeof PRESENTATION_FIELD_TYPES)[number],
        ) && (
          <div className="space-y-4">
            <SectionHeader>Contact Property</SectionHeader>
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
                <SelectField.Hint>Required for form publishing</SelectField.Hint>
              )}
            </SelectField.Root>

            {field.contactProperty && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-kb-surface-primary border border-kb-border-tertiary">
                {field.contactProperty.type === "standard"
                  ? (() => {
                      const Icon =
                        STANDARD_PROPERTY_INFO[field.contactProperty.id]?.icon ??
                        TextIcon;
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
