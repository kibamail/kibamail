"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { JSONContent } from "@tiptap/react";
import { Plus } from "iconoir-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InteractiveDiv } from "@/components/ui/interactive-div";
import { cn } from "@/lib/utils";
import { CanvasFieldRenderer } from "./canvas-field-renderer";
import { SUBMIT_BUTTON_ID, useFormBuilder } from "./form-builder-context";
import { DEFAULT_LIGHT_THEME, type FormField } from "./types";

function SortableField({
  field,
  isSelected,
  onClick,
  onRemove,
  onDuplicate,
  onContentChange,
}: {
  field: FormField;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onContentChange?: (content: JSONContent) => void;
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
      <CanvasFieldRenderer
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onContentChange={onContentChange}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

interface FormCanvasProps {
  readOnly?: boolean;
}

export function FormCanvas({ readOnly = false }: FormCanvasProps) {
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
    updateField,
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
    }),
  );

  const section = currentPage?.sections[0];
  const fields = section?.fields || [];
  const fieldIds = fields.map((f) => f.id);

  const theme = schema.settings.theme;
  const bodyBackground = (theme.body?.background as string) ?? "#f5f7fa";
  const containerBackground =
    (theme.container?.backgroundColor as string) ?? "#ffffff";
  const containerBorderRadius =
    (theme.container?.borderRadius as string) ?? "12px";
  const containerMaxWidth = (theme.container?.maxWidth as string) ?? "672px";
  const fontFamily = theme.font?.family ?? "Inter";
  const fontUrl = theme.font?.url;

  const colors = theme.colors ?? DEFAULT_LIGHT_THEME.colors;
  const themeStyleVars = {
    "--radius": theme.radius ?? DEFAULT_LIGHT_THEME.radius,
    "--font-family": `"${theme.font?.family ?? DEFAULT_LIGHT_THEME.font.family}", ui-sans-serif, system-ui, sans-serif`,
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--card": colors.card,
    "--card-foreground": colors.cardForeground,
    "--popover": colors.popover,
    "--popover-foreground": colors.popoverForeground,
    "--primary": colors.primary,
    "--primary-foreground": colors.primaryForeground,
    "--secondary": colors.secondary,
    "--secondary-foreground": colors.secondaryForeground,
    "--muted": colors.muted,
    "--muted-foreground": colors.mutedForeground,
    "--accent": colors.accent,
    "--accent-foreground": colors.accentForeground,
    "--destructive": colors.destructive,
    "--border": colors.border,
    "--input": colors.input,
    "--ring": colors.ring,
  } as React.CSSProperties;

  function parsePadding(
    obj: Record<string, unknown> | undefined,
    defaultValue: string,
  ): { top: string; right: string; bottom: string; left: string } {
    if (!obj) {
      return {
        top: defaultValue,
        right: defaultValue,
        bottom: defaultValue,
        left: defaultValue,
      };
    }

    const hasIndividual =
      obj.paddingTop ||
      obj.paddingRight ||
      obj.paddingBottom ||
      obj.paddingLeft;
    if (hasIndividual) {
      return {
        top: (obj.paddingTop as string) ?? defaultValue,
        right: (obj.paddingRight as string) ?? defaultValue,
        bottom: (obj.paddingBottom as string) ?? defaultValue,
        left: (obj.paddingLeft as string) ?? defaultValue,
      };
    }

    const shorthand = obj.padding as string;
    if (shorthand) {
      return {
        top: shorthand,
        right: shorthand,
        bottom: shorthand,
        left: shorthand,
      };
    }

    return {
      top: defaultValue,
      right: defaultValue,
      bottom: defaultValue,
      left: defaultValue,
    };
  }

  const bodyPadding = parsePadding(theme.body, "16px");
  const containerPadding = parsePadding(theme.container, "32px");

  const activeField = activeId ? fields.find((f) => f.id === activeId) : null;

  function onDragStart(dragEvent: DragStartEvent) {
    setActiveId(dragEvent.active.id as string);
  }

  function onDragEnd(dragEvent: DragEndEvent) {
    const { active, over } = dragEvent;

    setActiveId(null);

    if (!over || !section || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      moveField(
        selectedPageIndex,
        section.id,
        oldIndex,
        selectedPageIndex,
        section.id,
        newIndex,
      );
    }
  }

  function onContentChange(fieldId: string, content: JSONContent) {
    if (!section) return;
    updateField(selectedPageIndex, section.id, fieldId, {
      richContent: content as Record<string, unknown>,
    });
  }

  return (
    <>
      {/* Google Font */}
      {fontUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link rel="stylesheet" href={fontUrl} />
        </>
      )}

      <div
        className="flex-1 h-full flex flex-col overflow-y-auto"
        style={{
          background: bodyBackground,
          paddingTop: bodyPadding.top,
          paddingRight: bodyPadding.right,
          paddingBottom: bodyPadding.bottom,
          paddingLeft: bodyPadding.left,
        }}
      >
        {/* Canvas content */}
        <div className="flex-1 flex items-start justify-center">
          <div
            style={{
              ...themeStyleVars,
              width: "100%",
              maxWidth: containerMaxWidth,
              backgroundColor: containerBackground,
              borderRadius: containerBorderRadius,
              paddingTop: containerPadding.top,
              paddingRight: containerPadding.right,
              paddingBottom: containerPadding.bottom,
              paddingLeft: containerPadding.left,
              fontFamily: `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`,
            }}
          >
            {/* Form Title */}
            <div className="mb-8">
              <input
                type="text"
                value={schema.title}
                onChange={(event) =>
                  updateFormMeta({ title: event.target.value })
                }
                placeholder="Form Title"
                className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0"
                style={{ color: "inherit" }}
                readOnly={readOnly}
              />
              <input
                type="text"
                value={schema.description ?? ""}
                onChange={(event) =>
                  updateFormMeta({
                    description: event.target.value || undefined,
                  })
                }
                placeholder="Add a description..."
                className="w-full text-sm bg-transparent border-none focus:outline-none focus:ring-0 opacity-70 mt-1"
                style={{ color: "inherit" }}
                readOnly={readOnly}
              />
            </div>

            {/* Fields with DnD */}
            {section && !readOnly && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
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
                          onRemove={() =>
                            removeField(selectedPageIndex, section.id, field.id)
                          }
                          onDuplicate={() =>
                            duplicateField(
                              selectedPageIndex,
                              section.id,
                              field.id,
                            )
                          }
                          onContentChange={
                            field.type === "content"
                              ? (content) => onContentChange(field.id, content)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </SortableContext>

                {/* Drag Overlay */}
                <DragOverlay>
                  {activeField && (
                    <CanvasFieldRenderer
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

            {/* Read-only fields view (no DnD, no interactions) */}
            {section && readOnly && fields.length > 0 && (
              <div className="space-y-3">
                {fields.map((field) => (
                  <CanvasFieldRenderer
                    key={field.id}
                    field={field}
                    isSelected={false}
                    onClick={() => {}}
                    onRemove={() => {}}
                    onDuplicate={() => {}}
                    readOnly
                  />
                ))}
              </div>
            )}

            {/* Submit Button */}
            <div
              className={cn(
                "mt-6 flex",
                schema.settings.submitButton.fullWidth
                  ? "w-full"
                  : schema.settings.submitButton.position === "left"
                    ? "justify-start"
                    : schema.settings.submitButton.position === "center"
                      ? "justify-center"
                      : "justify-end",
              )}
            >
              <InteractiveDiv
                onClick={
                  readOnly ? undefined : () => selectField(SUBMIT_BUTTON_ID)
                }
                disabled={readOnly}
                aria-label="Select submit button"
                className={cn(
                  "group relative transition-all",
                  !readOnly && "cursor-pointer",
                  schema.settings.submitButton.fullWidth && "w-full",
                )}
              >
                {/* Selection indicator - left bar */}
                {!readOnly && (
                  <div
                    className={cn(
                      "absolute -left-3 top-0 bottom-0 w-0.5 rounded-full transition-colors",
                      selectedFieldId === SUBMIT_BUTTON_ID
                        ? "bg-kb-border-info"
                        : "bg-transparent group-hover:bg-kb-border-info",
                    )}
                  />
                )}
                <Button
                  type="button"
                  variant={schema.settings.submitButton.variant}
                  size={schema.settings.submitButton.size}
                  className={cn(
                    schema.settings.submitButton.fullWidth && "w-full",
                  )}
                >
                  {schema.settings.submitButton.text}
                </Button>
              </InteractiveDiv>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
