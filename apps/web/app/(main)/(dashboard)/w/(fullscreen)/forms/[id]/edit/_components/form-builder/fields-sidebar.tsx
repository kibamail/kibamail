"use client";

import {
  Type,
  AtSign,
  Hashtag,
  Phone,
  AlignLeft,
  List,
  Circle,
  CheckSquare,
  Calendar,
  Link,
  EyeClosed,
} from "iconoir-react";
import { FIELD_DEFINITIONS, type FieldType } from "./types";
import { useFormBuilder } from "./form-builder-context";

const FIELD_ICONS: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  email: AtSign,
  number: Hashtag,
  phone: Phone,
  textarea: AlignLeft,
  select: List,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  url: Link,
  hidden: EyeClosed,
};

export function FieldsSidebar() {
  const { schema, selectedPageIndex, addField } = useFormBuilder();
  const currentPage = schema.pages[selectedPageIndex];
  const firstSection = currentPage?.sections[0];

  function handleAddField(fieldType: FieldType) {
    if (firstSection) {
      addField(selectedPageIndex, firstSection.id, fieldType);
    }
  }

  return (
    <div className="w-[260px] h-full bg-kb-surface-secondary border-r border-kb-border-tertiary flex flex-col">
      <div className="p-4 border-b border-kb-border-tertiary">
        <h2 className="text-sm font-semibold text-kb-content-primary">Fields</h2>
        <p className="text-xs text-kb-content-tertiary mt-1">
          Click to add fields to your form
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {FIELD_DEFINITIONS.map((field) => {
            const Icon = FIELD_ICONS[field.type];
            return (
              <button
                key={field.type}
                type="button"
                onClick={() => handleAddField(field.type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left hover:bg-kb-surface-tertiary transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-kb-surface-primary border border-kb-border-tertiary flex items-center justify-center group-hover:border-kb-border-primary transition-colors">
                  <Icon className="w-4 h-4 text-kb-content-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-kb-content-primary">
                    {field.label}
                  </div>
                  <div className="text-xs text-kb-content-tertiary truncate">
                    {field.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
