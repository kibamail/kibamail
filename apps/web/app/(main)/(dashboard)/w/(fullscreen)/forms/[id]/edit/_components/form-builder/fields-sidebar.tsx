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
  LayoutLeft,
  NavArrowDown,
} from "iconoir-react";
import { useState } from "react";
import * as Tabs from "@kibamail/owly/tabs";
import * as Select from "@kibamail/owly/select-field";
import * as ColorField from "@kibamail/owly/color-field";
import * as TextField from "@kibamail/owly/text-field";
import { FIELD_DEFINITIONS, FIELD_CATEGORIES, type FieldType } from "./types";
import { useFormBuilder } from "./form-builder-context";
import { SpacingInput } from "./spacing-input";

// Popular Google Fonts for forms
const POPULAR_FONTS = [
  {
    name: "Inter",
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  {
    name: "Roboto",
    url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  },
  {
    name: "Open Sans",
    url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap",
  },
  {
    name: "Lato",
    url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
  },
  {
    name: "Poppins",
    url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  },
  {
    name: "Montserrat",
    url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
  },
  {
    name: "Source Sans Pro",
    url: "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap",
  },
  {
    name: "Nunito",
    url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
  },
  {
    name: "Playfair Display",
    url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  },
  {
    name: "Merriweather",
    url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
  },
];

const FIELD_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
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
  FileText: LayoutLeft,
  LayoutList: List,
};

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Type,
  List,
  Puzzle,
  LayoutList: List,
};

export function FieldsSidebar() {
  const { schema, selectedPageIndex, addField, currentPage, updateTheme } =
    useFormBuilder();
  const firstSection = currentPage?.sections[0];
  const [activeTab, setActiveTab] = useState("fields");

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    input: true,
    selection: true,
    advanced: false,
    presentation: true,
  });

  const [expandedStyleSections, setExpandedStyleSections] = useState<
    Record<string, boolean>
  >({
    body: true,
    container: true,
    colors: true,
  });

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }

  function toggleStyleSection(section: string) {
    setExpandedStyleSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function onAddField(fieldType: FieldType) {
    if (firstSection) {
      addField(selectedPageIndex, firstSection.id, fieldType);
    }
  }

  function onFontChange(fontName: string) {
    const font = POPULAR_FONTS.find((f) => f.name === fontName);
    if (font) {
      updateTheme({
        font: { family: font.name, url: font.url },
      });
    }
  }

  function onBodyBackgroundChange(color: string) {
    updateTheme({
      body: {
        ...schema.settings.theme.body,
        background: color,
      },
    });
  }

  function onContainerBackgroundChange(color: string) {
    updateTheme({
      container: {
        ...schema.settings.theme.container,
        backgroundColor: color,
      },
    });
  }

  function onContainerBorderRadiusChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/[^0-9]/g, "");
    updateTheme({
      container: {
        ...schema.settings.theme.container,
        borderRadius: value ? `${value}px` : "0px",
      },
    });
  }

  function onContainerWidthChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/[^0-9]/g, "");
    updateTheme({
      container: {
        ...schema.settings.theme.container,
        width: "100%",
        maxWidth: value ? `${value}px` : "none",
      },
    });
  }

  function onBodyPaddingChange(side: "top" | "right" | "bottom" | "left", value: string) {
    const paddingKey = `padding${side.charAt(0).toUpperCase()}${side.slice(1)}`;
    updateTheme({
      body: {
        ...schema.settings.theme.body,
        [paddingKey]: value,
      },
    });
  }

  function onContainerPaddingChange(side: "top" | "right" | "bottom" | "left", value: string) {
    const paddingKey = `padding${side.charAt(0).toUpperCase()}${side.slice(1)}`;
    updateTheme({
      container: {
        ...schema.settings.theme.container,
        [paddingKey]: value,
      },
    });
  }

  function onThemeColorChange(colorKey: keyof typeof schema.settings.theme.colors, value: string) {
    updateTheme({
      colors: {
        ...schema.settings.theme.colors,
        [colorKey]: value,
      },
    });
  }

  const bodyBackground = schema.settings.theme.body?.background as string ?? "#f5f7fa";
  const containerBackground = schema.settings.theme.container?.backgroundColor as string ?? "#ffffff";
  const containerBorderRadius = schema.settings.theme.container?.borderRadius as string ?? "12px";
  const containerMaxWidth = schema.settings.theme.container?.maxWidth as string ?? "672px";

  function parsePadding(
    obj: Record<string, unknown> | undefined,
    defaultValue: string
  ): { top: string; right: string; bottom: string; left: string } {
    if (!obj) {
      return { top: defaultValue, right: defaultValue, bottom: defaultValue, left: defaultValue };
    }

    // Check for individual padding properties first
    const hasIndividual = obj.paddingTop || obj.paddingRight || obj.paddingBottom || obj.paddingLeft;
    if (hasIndividual) {
      return {
        top: (obj.paddingTop as string) ?? defaultValue,
        right: (obj.paddingRight as string) ?? defaultValue,
        bottom: (obj.paddingBottom as string) ?? defaultValue,
        left: (obj.paddingLeft as string) ?? defaultValue,
      };
    }

    // Fall back to shorthand padding
    const shorthand = obj.padding as string;
    if (shorthand) {
      return { top: shorthand, right: shorthand, bottom: shorthand, left: shorthand };
    }

    return { top: defaultValue, right: defaultValue, bottom: defaultValue, left: defaultValue };
  }

  const bodyPadding = parsePadding(schema.settings.theme.body, "16px");
  const containerPadding = parsePadding(schema.settings.theme.container, "32px");

  function extractColor(value: string): string {
    if (value.startsWith("#")) return value;
    if (value.startsWith("linear-gradient") || value.startsWith("radial-gradient")) {
      const match = value.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}/);
      return match ? match[0] : "#f5f7fa";
    }
    return "#f5f7fa";
  }

  const fieldsByCategory = FIELD_DEFINITIONS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof FIELD_DEFINITIONS>);

  return (
    <div className="w-[300px] h-full bg-kb-surface-secondary border-r border-kb-border-tertiary flex flex-col shrink-0">
      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
        width={"full"}
      >
        <div className="px-4 py-3 border-b border-kb-border-tertiary">
          <Tabs.List>
            <Tabs.Trigger value="fields">Fields</Tabs.Trigger>
            <Tabs.Trigger value="styles">Styles</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
        </div>

        <Tabs.Content value="fields" className="flex-1 overflow-y-auto p-3">
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
                          onClick={() => onAddField(field.type)}
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
        </Tabs.Content>

        <Tabs.Content value="styles" className="flex-1 overflow-y-auto">
          {/* Font Family Section */}
          <div className="border-b border-kb-border-tertiary">
            <div className="px-4 py-3">
              <Select.Root
                value={schema.settings.theme.font.family}
                onValueChange={onFontChange}
              >
                <Select.Label>Font Family</Select.Label>
                <Select.Trigger placeholder="Select font" />
                <Select.Content>
                  {POPULAR_FONTS.map((font) => (
                    <Select.Item key={font.name} value={font.name}>
                      {font.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          {/* Page Section */}
          <div className="border-b border-kb-border-tertiary">
            <button
              type="button"
              onClick={() => toggleStyleSection("body")}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-kb-surface-tertiary transition-colors"
            >
              <span className="text-sm font-semibold text-kb-content-primary">
                Page
              </span>
              <NavArrowDown
                className={`w-4 h-4 text-kb-content-tertiary transition-transform duration-200 ${
                  expandedStyleSections.body ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedStyleSections.body && (
              <div className="flex flex-col gap-3 pb-4">
                <div className="px-4">
                  <ColorField.Root
                    label="Background"
                    value={extractColor(bodyBackground)}
                    onColorChange={onBodyBackgroundChange}
                  />
                </div>
                <div className="px-4">
                  <SpacingInput
                    label="Padding"
                    values={bodyPadding}
                    onChange={onBodyPaddingChange}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Container Section */}
          <div className="border-b border-kb-border-tertiary last:border-b-0">
            <button
              type="button"
              onClick={() => toggleStyleSection("container")}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-kb-surface-tertiary transition-colors"
            >
              <span className="text-sm font-semibold text-kb-content-primary">
                Container
              </span>
              <NavArrowDown
                className={`w-4 h-4 text-kb-content-tertiary transition-transform duration-200 ${
                  expandedStyleSections.container ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedStyleSections.container && (
              <div className="flex flex-col gap-3 pb-4">
                <div className="px-4">
                  <ColorField.Root
                    label="Background"
                    value={extractColor(containerBackground)}
                    onColorChange={onContainerBackgroundChange}
                  />
                </div>
                <div className="px-4">
                  <TextField.Root
                    value={containerMaxWidth.replace(/[^0-9]/g, "")}
                    onChange={onContainerWidthChange}
                    placeholder="672"
                  >
                    <TextField.Label>Width</TextField.Label>
                    <TextField.Slot side="right">px</TextField.Slot>
                  </TextField.Root>
                </div>
                <div className="px-4">
                  <TextField.Root
                    value={containerBorderRadius.replace(/[^0-9]/g, "")}
                    onChange={onContainerBorderRadiusChange}
                    placeholder="12"
                  >
                    <TextField.Label>Border Radius</TextField.Label>
                    <TextField.Slot side="right">px</TextField.Slot>
                  </TextField.Root>
                </div>
                <div className="px-4">
                  <SpacingInput
                    label="Padding"
                    values={containerPadding}
                    onChange={onContainerPaddingChange}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Colors Section */}
          <div className="border-b border-kb-border-tertiary last:border-b-0">
            <button
              type="button"
              onClick={() => toggleStyleSection("colors")}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-kb-surface-tertiary transition-colors"
            >
              <span className="text-sm font-semibold text-kb-content-primary">
                Colors
              </span>
              <NavArrowDown
                className={`w-4 h-4 text-kb-content-tertiary transition-transform duration-200 ${
                  expandedStyleSections.colors ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedStyleSections.colors && (
              <div className="flex flex-col gap-3 pb-4">
                <div className="px-4">
                  <ColorField.Root
                    label="Primary"
                    value={schema.settings.theme.colors?.primary ?? "#18181b"}
                    onColorChange={(color) => onThemeColorChange("primary", color)}
                  />
                </div>
                <div className="px-4">
                  <ColorField.Root
                    label="Primary Text"
                    value={schema.settings.theme.colors?.primaryForeground ?? "#fafafa"}
                    onColorChange={(color) => onThemeColorChange("primaryForeground", color)}
                  />
                </div>
                <div className="px-4">
                  <ColorField.Root
                    label="Text"
                    value={schema.settings.theme.colors?.foreground ?? "#09090b"}
                    onColorChange={(color) => onThemeColorChange("foreground", color)}
                  />
                </div>
                <div className="px-4">
                  <ColorField.Root
                    label="Muted Text"
                    value={schema.settings.theme.colors?.mutedForeground ?? "#71717a"}
                    onColorChange={(color) => onThemeColorChange("mutedForeground", color)}
                  />
                </div>
                <div className="px-4">
                  <ColorField.Root
                    label="Border"
                    value={schema.settings.theme.colors?.border ?? "#e4e4e7"}
                    onColorChange={(color) => onThemeColorChange("border", color)}
                  />
                </div>
                <div className="px-4">
                  <ColorField.Root
                    label="Input Border"
                    value={schema.settings.theme.colors?.input ?? "#e4e4e7"}
                    onColorChange={(color) => onThemeColorChange("input", color)}
                  />
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
