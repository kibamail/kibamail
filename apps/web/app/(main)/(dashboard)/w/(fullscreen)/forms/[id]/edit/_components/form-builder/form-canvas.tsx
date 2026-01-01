"use client";

import { useState } from "react";
import { Plus, Trash, Copy, Menu } from "iconoir-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFormBuilder } from "./form-builder-context";
import { FIELD_TYPE_CONFIGS, type FormField } from "./types";
import { cn } from "@/lib/utils";

// =============================================================================
// SORTABLE FIELD
// =============================================================================

function SortableField({
  field,
  isSelected,
  onClick,
  onRemove,
  onDuplicate,
}: {
  field: FormField;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <FieldRenderer
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function FieldRenderer({
  field,
  isSelected,
  onClick,
  onRemove,
  onDuplicate,
  dragHandleProps,
  isOverlay,
}: {
  field: FormField;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown>;
  isOverlay?: boolean;
}) {
  const config = FIELD_TYPE_CONFIGS[field.type];

  const renderFieldPreview = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
        return (
          <input
            type="text"
            placeholder={field.placeholder || `Enter ${config.label.toLowerCase()}...`}
            disabled
            className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
          />
        );

      case "number":
        return (
          <input
            type="number"
            placeholder={field.placeholder || "0"}
            disabled
            className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
          />
        );

      case "textarea":
        return (
          <textarea
            placeholder={field.placeholder || "Enter text..."}
            disabled
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm resize-none"
          />
        );

      case "select":
        return (
          <select
            disabled
            className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
          >
            <option>{field.placeholder || "Select an option..."}</option>
          </select>
        );

      case "multi_select":
      case "checkbox_group":
        return (
          <div className="space-y-2">
            {field.options?.slice(0, 3).map((opt) => (
              <label key={opt.id} className="flex items-center gap-2">
                <input type="checkbox" disabled className="w-4 h-4 rounded" />
                <span className="text-sm text-kb-content-secondary">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.slice(0, 3).map((opt) => (
              <label key={opt.id} className="flex items-center gap-2">
                <input type="radio" disabled className="w-4 h-4" />
                <span className="text-sm text-kb-content-secondary">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case "choice_card":
        return (
          <div className="space-y-2">
            {field.options?.slice(0, 2).map((opt) => (
              <div
                key={opt.id}
                className="flex items-start justify-between p-3 rounded-lg border border-kb-border-secondary bg-kb-surface-secondary"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-kb-content-primary">
                    {opt.label}
                  </div>
                </div>
                <input type="radio" disabled className="w-4 h-4 mt-0.5" />
              </div>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled className="w-4 h-4 rounded" />
            <span className="text-sm text-kb-content-secondary">{field.label}</span>
          </label>
        );

      case "date":
        return (
          <input
            type="date"
            disabled
            className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
          />
        );

      case "time":
        return (
          <input
            type="time"
            disabled
            className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
          />
        );

      case "datetime":
        return (
          <input
            type="datetime-local"
            disabled
            className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
          />
        );

      case "rating":
        return (
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <svg
                key={i}
                className="w-6 h-6 text-kb-content-tertiary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            ))}
          </div>
        );

      case "slider":
        return (
          <input type="range" disabled className="w-full" />
        );

      case "file":
        return (
          <div className="flex items-center justify-center w-full h-16 border-2 border-dashed border-kb-border-secondary rounded-lg bg-kb-surface-secondary">
            <span className="text-xs text-kb-content-tertiary">Click or drag to upload</span>
          </div>
        );

      case "hidden":
        return (
          <div className="px-3 py-2 rounded-md border border-dashed border-kb-border-secondary bg-kb-surface-tertiary text-kb-content-tertiary text-sm">
            Hidden field
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 rounded-lg border-2 cursor-pointer transition-all",
        isSelected
          ? "border-kb-primary bg-kb-primary/5 ring-2 ring-kb-primary/20"
          : "border-kb-border-tertiary hover:border-kb-border-primary bg-kb-surface-primary",
        isOverlay && "shadow-lg"
      )}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <div className="bg-kb-surface-primary border border-kb-border-secondary rounded-md shadow-sm p-0.5">
          <Menu className="w-4 h-4 text-kb-content-tertiary" />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {field.type !== "checkbox" && (
            <label className="block text-sm font-medium text-kb-content-primary mb-2">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
          )}
          {renderFieldPreview()}
          {field.description && (
            <p className="text-xs text-kb-content-tertiary mt-2">
              {field.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1.5 rounded-md hover:bg-kb-surface-tertiary text-kb-content-tertiary hover:text-kb-content-primary transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-md hover:bg-red-50 text-kb-content-tertiary hover:text-red-500 transition-colors"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FORM CANVAS
// =============================================================================

export function FormCanvas() {
  const {
    schema,
    selectedPageIndex,
    selectedFieldId,
    selectField,
    currentPage,
    updateFormMeta,
    removeField,
    duplicateField,
    moveField,
  } = useFormBuilder();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get the first section (we're using a single section for signup forms)
  const section = currentPage?.sections[0];
  const fields = section?.fields || [];
  const fieldIds = fields.map(f => f.id);

  const activeField = activeId
    ? fields.find(f => f.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);

    if (!over || !section || active.id === over.id) return;

    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      moveField(
        selectedPageIndex,
        section.id,
        oldIndex,
        selectedPageIndex,
        section.id,
        newIndex
      );
    }
  }

  return (
    <div className="flex-1 h-full bg-kb-bg-primary flex flex-col overflow-hidden">
      {/* Canvas content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-6">
          {/* Form Title */}
          <div className="mb-8">
            <input
              type="text"
              value={schema.title}
              onChange={(e) => updateFormMeta({ title: e.target.value })}
              placeholder="Form Title"
              className="w-full text-2xl font-bold text-kb-content-primary bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-kb-content-tertiary"
            />
            <input
              type="text"
              value={schema.description ?? ""}
              onChange={(e) =>
                updateFormMeta({ description: e.target.value || undefined })
              }
              placeholder="Add a description..."
              className="w-full text-sm text-kb-content-secondary bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-kb-content-tertiary mt-1"
            />
          </div>

          {/* Fields with DnD */}
          {section && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fieldIds}
                strategy={verticalListSortingStrategy}
              >
                {fields.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-kb-border-secondary rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-kb-surface-secondary flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-6 h-6 text-kb-content-tertiary" />
                    </div>
                    <p className="text-sm text-kb-content-tertiary">
                      Click a field from the sidebar to add it to your form
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        isSelected={selectedFieldId === field.id}
                        onClick={() => selectField(field.id)}
                        onRemove={() => removeField(selectedPageIndex, section.id, field.id)}
                        onDuplicate={() => duplicateField(selectedPageIndex, section.id, field.id)}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeField && (
                  <FieldRenderer
                    field={activeField}
                    isSelected={false}
                    onClick={() => {}}
                    onRemove={() => {}}
                    onDuplicate={() => {}}
                    isOverlay
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
