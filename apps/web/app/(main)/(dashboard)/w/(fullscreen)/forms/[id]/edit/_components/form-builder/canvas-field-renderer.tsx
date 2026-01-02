"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { Trash, Copy, Menu } from "iconoir-react";
import type { JSONContent } from "@tiptap/react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field";

import type { FormField as FormFieldType } from "./types";
import { ContentFieldEditor } from "./content-field-editor";
import { ContentBlockRenderer } from "@/lib/form-builder/components/content-block-renderer";

// =============================================================================
// FIELD DECORATOR - Wraps fields with drag/delete/copy actions
// =============================================================================

interface FieldDecoratorProps {
  field: FormFieldType;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown>;
  isOverlay?: boolean;
  allowInteraction?: boolean;
  children: React.ReactNode;
}

export function FieldDecorator({
  field,
  isSelected,
  onClick,
  onRemove,
  onDuplicate,
  dragHandleProps,
  isOverlay,
  allowInteraction,
  children,
}: FieldDecoratorProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer transition-all",
        isOverlay && "shadow-lg bg-white"
      )}
    >
      {/* Selection indicator - left bar */}
      <div
        className={cn(
          "absolute -left-3 top-0 bottom-0 w-0.5 rounded-full transition-colors",
          isSelected
            ? "bg-kb-border-info"
            : "bg-transparent group-hover:bg-kb-border-info"
        )}
      />

      {/* Action buttons - top right */}
      <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-kb-bg-primary">
        <div className="flex items-center gap-0.5 bg-kb-surface-primary border border-kb-border-secondary rounded-md shadow-sm p-0.5">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="p-1 rounded hover:bg-kb-surface-tertiary text-kb-content-tertiary hover:text-kb-content-primary transition-colors cursor-grab active:cursor-grabbing"
          >
            <Menu className="w-3.5 h-3.5" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 rounded hover:bg-kb-surface-tertiary text-kb-content-tertiary hover:text-kb-content-primary transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded hover:bg-red-50 text-kb-content-tertiary hover:text-red-500 transition-colors"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Field content - pointer-events-none prevents interaction with inputs */}
      <div className={allowInteraction ? undefined : "pointer-events-none"}>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// CANVAS FIELD RENDERER
// =============================================================================

interface CanvasFieldRendererProps {
  field: FormFieldType;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onContentChange?: (content: JSONContent) => void;
  dragHandleProps?: Record<string, unknown>;
  isOverlay?: boolean;
}

export function CanvasFieldRenderer({
  field,
  isSelected,
  onClick,
  onRemove,
  onDuplicate,
  onContentChange,
  dragHandleProps,
  isOverlay,
}: CanvasFieldRendererProps) {
  const isRequired = field.validation?.required;

  // Content field has special handling with inline editor
  if (field.type === "content") {
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
        allowInteraction
      >
        <div onClick={(e) => e.stopPropagation()}>
          {!isOverlay && onContentChange ? (
            <ContentFieldEditor
              content={field.richContent}
              onChange={onContentChange}
              placeholder="Type '/' for commands, or start writing..."
            />
          ) : (
            <ContentBlockRenderer content={field.richContent} />
          )}
        </div>
      </FieldDecorator>
    );
  }

  // Hidden field
  if (field.type === "hidden") {
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
      >
        <div className="px-3 py-2 rounded-md border border-dashed border-muted-foreground/50 bg-muted/50 text-muted-foreground text-sm">
          Hidden field: {field.name}
        </div>
      </FieldDecorator>
    );
  }

  // Checkbox field (horizontal layout)
  if (field.type === "checkbox") {
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
      >
        <Field orientation="horizontal">
          <Checkbox id={field.id} />
          <FieldContent>
            <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
            {field.description && (
              <FieldDescription>{field.description}</FieldDescription>
            )}
          </FieldContent>
        </Field>
      </FieldDecorator>
    );
  }

  // Checkbox group
  if (field.type === "checkbox_group") {
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
      >
        <Field>
          <FieldLabel>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          <FieldGroup className="gap-3">
            {field.options?.map((option) => (
              <Field key={option.id} orientation="horizontal">
                <Checkbox id={`${field.id}_${option.id}`} />
                <FieldLabel htmlFor={`${field.id}_${option.id}`}>
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        </Field>
      </FieldDecorator>
    );
  }

  // Radio field
  if (field.type === "radio") {
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
      >
        <Field>
          <FieldLabel>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          <RadioGroup>
            {field.options?.map((option) => (
              <Field key={option.id} orientation="horizontal">
                <RadioGroupItem
                  id={`${field.id}_${option.id}`}
                  value={option.value}
                />
                <FieldLabel htmlFor={`${field.id}_${option.id}`}>
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </Field>
      </FieldDecorator>
    );
  }

  // Choice card field
  if (field.type === "choice_card") {
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
      >
        <Field>
          <FieldLabel>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          <RadioGroup className="gap-3">
            {field.options?.map((option) => (
              <FieldLabel key={option.id} htmlFor={`${field.id}_${option.id}`}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{option.label}</FieldTitle>
                    {option.description && (
                      <FieldDescription>{option.description}</FieldDescription>
                    )}
                  </FieldContent>
                  <RadioGroupItem
                    value={option.value}
                    id={`${field.id}_${option.id}`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </Field>
      </FieldDecorator>
    );
  }

  // Rating field
  if (field.type === "rating") {
    const maxRating = field.validation?.rating?.maxRating ?? 5;
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
      >
        <Field>
          <FieldLabel>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          <div className="flex gap-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <Star key={i} className="size-6 text-muted-foreground" />
            ))}
          </div>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
        </Field>
      </FieldDecorator>
    );
  }

  // Slider field
  if (field.type === "slider") {
    const min = field.validation?.slider?.min ?? 0;
    const max = field.validation?.slider?.max ?? 100;
    return (
      <FieldDecorator
        field={field}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
      >
        <Field>
          <FieldLabel>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          <div className="space-y-3">
            <Slider value={[min]} min={min} max={max} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
        </Field>
      </FieldDecorator>
    );
  }

  // Default input types (text, email, number, phone, url, textarea, select, date, time, datetime, file)
  const renderInput = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
        return (
          <Input
            id={field.id}
            type={field.type === "phone" ? "tel" : field.type}
            placeholder={field.placeholder}
          />
        );

      case "number":
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
          />
        );

      case "textarea":
        return (
          <Textarea id={field.id} placeholder={field.placeholder} />
        );

      case "select":
        return (
          <Select>
            <SelectTrigger id={field.id} className="w-full">
              <SelectValue
                placeholder={field.placeholder ?? "Select an option"}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select":
        return (
          <FieldGroup className="gap-3">
            {field.options?.map((option) => (
              <Field key={option.id} orientation="horizontal">
                <Checkbox id={`${field.id}_${option.id}`} />
                <FieldLabel htmlFor={`${field.id}_${option.id}`}>
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        );

      case "date":
        return <Input id={field.id} type="date" />;

      case "time":
        return <Input id={field.id} type="time" />;

      case "datetime":
        return <Input id={field.id} type="datetime-local" />;

      case "file":
        return <Input id={field.id} type="file" />;

      default:
        return null;
    }
  };

  return (
    <FieldDecorator
      field={field}
      isSelected={isSelected}
      onClick={onClick}
      onRemove={onRemove}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      isOverlay={isOverlay}
    >
      <Field>
        <FieldLabel htmlFor={field.id}>
          {field.label}
          {isRequired && <span className="text-destructive ml-0.5">*</span>}
        </FieldLabel>
        {renderInput()}
        {field.description && (
          <FieldDescription>{field.description}</FieldDescription>
        )}
      </Field>
    </FieldDecorator>
  );
}
