"use client";

import { Xmark, Plus, Trash, Menu } from "iconoir-react";
import { useFormBuilder } from "./form-builder-context";
import { FIELD_TYPE_CONFIGS, type FieldWidth, type LabelPosition } from "./types";
import { cn } from "@/lib/utils";

export function FieldPropertiesPanel() {
  const {
    selectedField,
    selectedFieldId,
    getFieldLocation,
    updateField,
    clearSelection,
    addFieldOption,
    removeFieldOption,
    updateFieldOption,
  } = useFormBuilder();

  if (!selectedField || !selectedFieldId) {
    return null;
  }

  const location = getFieldLocation(selectedFieldId);
  if (!location) return null;

  const { pageIndex, sectionId } = location;
  const fieldConfig = FIELD_TYPE_CONFIGS[selectedField.type];

  const handleUpdate = (updates: Parameters<typeof updateField>[3]) => {
    updateField(pageIndex, sectionId, selectedFieldId, updates);
  };

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
              value={selectedField.label}
              onChange={(e) => handleUpdate({ label: e.target.value })}
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
              value={selectedField.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
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
                value={selectedField.placeholder ?? ""}
                onChange={(e) => handleUpdate({ placeholder: e.target.value })}
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
              value={selectedField.description ?? ""}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              placeholder="Help text for users..."
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
            />
          </div>
        </div>

        {/* Options (for select, radio, etc.) */}
        {fieldConfig.supportsOptions && selectedField.options && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
                Options
              </h3>
              <button
                type="button"
                onClick={() => addFieldOption(pageIndex, sectionId, selectedFieldId)}
                className="p-1 rounded-md hover:bg-kb-surface-tertiary text-kb-content-tertiary hover:text-kb-content-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {selectedField.options.map((option, index) => (
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
                      onChange={(e) =>
                        updateFieldOption(
                          pageIndex,
                          sectionId,
                          selectedFieldId,
                          option.id,
                          { label: e.target.value }
                        )
                      }
                      placeholder="Label"
                      className="w-full px-2 py-1.5 rounded border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-primary text-sm focus:outline-none focus:ring-1 focus:ring-kb-primary/20 focus:border-kb-primary"
                    />
                    <input
                      type="text"
                      value={option.value}
                      onChange={(e) =>
                        updateFieldOption(
                          pageIndex,
                          sectionId,
                          selectedFieldId,
                          option.id,
                          { value: e.target.value }
                        )
                      }
                      placeholder="Value"
                      className="w-full px-2 py-1.5 rounded border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-kb-primary/20 focus:border-kb-primary"
                    />
                    {selectedField.type === "choice_card" && (
                      <input
                        type="text"
                        value={option.description ?? ""}
                        onChange={(e) =>
                          updateFieldOption(
                            pageIndex,
                            sectionId,
                            selectedFieldId,
                            option.id,
                            { description: e.target.value }
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
                        option.id
                      )
                    }
                    disabled={(selectedField.options?.length ?? 0) <= 1}
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
              checked={selectedField.validation?.required ?? false}
              onChange={(e) =>
                handleUpdate({
                  validation: {
                    ...selectedField.validation,
                    required: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 rounded border-kb-border-secondary text-kb-primary focus:ring-kb-primary/20"
            />
            <span className="text-sm text-kb-content-primary">Required field</span>
          </label>

          {/* Required Message */}
          {selectedField.validation?.required && (
            <div className="space-y-1.5 ml-7">
              <label className="text-sm font-medium text-kb-content-primary">
                Error Message
              </label>
              <input
                type="text"
                value={selectedField.validation?.requiredMessage ?? ""}
                onChange={(e) =>
                  handleUpdate({
                    validation: {
                      ...selectedField.validation,
                      requiredMessage: e.target.value,
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
                      handleUpdate({
                        appearance: { ...selectedField.appearance, width },
                      })
                    }
                    className={cn(
                      "px-2 py-1.5 rounded text-xs font-medium transition-colors",
                      selectedField.appearance.width === width
                        ? "bg-kb-primary text-white"
                        : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary"
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
                )
              )}
            </div>
          </div>

          {/* Label Position */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-kb-content-primary">
              Label Position
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["top", "left", "hidden"] as LabelPosition[]).map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() =>
                    handleUpdate({
                      appearance: {
                        ...selectedField.appearance,
                        labelPosition: position,
                      },
                    })
                  }
                  className={cn(
                    "px-2 py-1.5 rounded text-xs font-medium capitalize transition-colors",
                    selectedField.appearance.labelPosition === position
                      ? "bg-kb-primary text-white"
                      : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary"
                  )}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
