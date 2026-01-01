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
  Clock,
  Link,
  EyeClosed,
  Star,
  ControlSlider,
  Upload,
  ViewGrid,
  Puzzle,
  ListSelect,
  Plus,
  Minus,
} from "iconoir-react";
import { useState } from "react";
import { FIELD_DEFINITIONS, FIELD_CATEGORIES, type FieldType } from "./types";
import { useFormBuilder } from "./form-builder-context";
import { cn } from "@/lib/utils";

const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  AtSign,
  Hash: Hashtag,
  Phone,
  Link,
  AlignLeft,
  Calendar,
  Clock,
  CalendarClock: Clock,
  ChevronDown: List,
  ListChecks: ListSelect,
  CircleDot: Circle,
  LayoutGrid: ViewGrid,
  CheckSquare,
  CheckSquare2: CheckSquare,
  Star,
  SlidersHorizontal: ControlSlider,
  Upload,
  EyeOff: EyeClosed,
  Puzzle,
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  List,
  Puzzle,
};

export function FieldsSidebar() {
  const { schema, selectedPageIndex, addField, currentPage } = useFormBuilder();
  const firstSection = currentPage?.sections[0];

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    input: true,
    selection: true,
    advanced: false,
  });

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }

  function handleAddField(fieldType: FieldType) {
    if (firstSection) {
      addField(selectedPageIndex, firstSection.id, fieldType);
    }
  }

  const fieldsByCategory = FIELD_DEFINITIONS.reduce(
    (acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
      return acc;
    },
    {} as Record<string, typeof FIELD_DEFINITIONS>
  );

  return (
    <div className="w-[260px] h-full bg-kb-surface-secondary border-r border-kb-border-tertiary flex flex-col shrink-0">
      <div className="p-4 border-b border-kb-border-tertiary">
        <h2 className="text-sm font-semibold text-kb-content-primary">Fields</h2>
        <p className="text-xs text-kb-content-tertiary mt-1">
          Click to add fields to your form
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(FIELD_CATEGORIES).map(([categoryKey, category]) => {
          const CategoryIcon = CATEGORY_ICONS[category.icon] || Type;
          const fields = fieldsByCategory[categoryKey] || [];
          const isExpanded = expandedCategories[categoryKey];

          return (
            <div key={categoryKey} className="mb-3">
              <button
                type="button"
                onClick={() => toggleCategory(categoryKey)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left hover:bg-kb-surface-tertiary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-4 h-4 text-kb-content-tertiary" />
                  <span className="text-xs font-semibold text-kb-content-secondary uppercase tracking-wide">
                    {category.label}
                  </span>
                </div>
                {isExpanded ? (
                  <Minus className="w-3 h-3 text-kb-content-tertiary" />
                ) : (
                  <Plus className="w-3 h-3 text-kb-content-tertiary" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {fields.map((field) => {
                    const Icon = FIELD_ICONS[field.icon] || Type;
                    return (
                      <button
                        key={field.type}
                        type="button"
                        onClick={() => handleAddField(field.type)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-kb-surface-tertiary transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-md bg-kb-surface-primary border border-kb-border-tertiary flex items-center justify-center group-hover:border-kb-border-primary transition-colors shrink-0">
                          <Icon className="w-3.5 h-3.5 text-kb-content-secondary" />
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
