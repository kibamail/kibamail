import { useState } from "react";
import { useEditorConfig } from "@/contexts/editor-config-context";
import { ColorField, Text, TextField, SelectField } from "@kibamail/owly";
import { NavArrowDown } from "iconoir-react";
import { SpacingInput } from "./spacing-input";
import type { HeadingLevel } from "@/types/editor-config";
import "./spacing-input.scss";

interface HeadingConfigSectionProps {
  defaultExpanded?: boolean;
}

function parseSpacingValue(value: string | undefined): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  if (!value) {
    return { top: "0px", right: "0px", bottom: "0px", left: "0px" };
  }

  const parts = value.toString().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return {
      top: parts[0],
      right: parts[1],
      bottom: parts[0],
      left: parts[1],
    };
  }
  if (parts.length === 3) {
    return {
      top: parts[0],
      right: parts[1],
      bottom: parts[2],
      left: parts[1],
    };
  }
  return {
    top: parts[0] || "0px",
    right: parts[1] || "0px",
    bottom: parts[2] || "0px",
    left: parts[3] || "0px",
  };
}

function combineSpacingValue(values: {
  top: string;
  right: string;
  bottom: string;
  left: string;
}): string {
  return `${values.top} ${values.right} ${values.bottom} ${values.left}`;
}

const HEADING_OPTIONS = [
  { value: "1", label: "Heading 1" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
];

const DEFAULT_FONT_SIZES: Record<HeadingLevel, string> = {
  1: "32px",
  2: "24px",
  3: "20px",
  4: "18px",
};

export function HeadingConfigSection({
  defaultExpanded = false,
}: HeadingConfigSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { getHeadingStyles, updateHeadingStyleProperty } = useEditorConfig();
  const [selectedLevel, setSelectedLevel] = useState<HeadingLevel>(1);

  function toggleExpanded() {
    setIsExpanded((prev) => !prev);
  }

  const currentStyles = getHeadingStyles(selectedLevel) || {};

  const fontSize =
    (currentStyles.fontSize as string) || DEFAULT_FONT_SIZES[selectedLevel];
  const color = (currentStyles.color as string) || "#000000";
  const marginValues = parseSpacingValue(currentStyles.margin as string);

  function onLevelChange(value: string) {
    setSelectedLevel(parseInt(value, 10) as HeadingLevel);
  }

  function onFontSizeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/[^0-9]/g, "");
    updateHeadingStyleProperty(selectedLevel, "fontSize", value ? `${value}px` : "16px");
  }

  function onColorChange(newColor: string) {
    updateHeadingStyleProperty(selectedLevel, "color", newColor);
  }

  function onMarginChange(side: "top" | "right" | "bottom" | "left", value: string) {
    const newValues = { ...marginValues, [side]: value };
    updateHeadingStyleProperty(selectedLevel, "margin", combineSpacingValue(newValues));
  }

  const fontSizeNumeric = fontSize.replace(/[^0-9]/g, "");

  return (
    <div className={`email-editor-config-section ${isExpanded ? "email-editor-config-section-expanded" : ""}`}>
      <button
        type="button"
        className="email-editor-config-section-header"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        <Text size="lg" className="email-editor-config-section-header-title">
          Heading
        </Text>
        <NavArrowDown className="email-editor-config-section-arrow" />
      </button>

      <div className={`email-editor-config-section-content ${isExpanded ? "email-editor-config-section-content-expanded" : ""}`}>
        <div className="email-editor-config-section-content-inner">
          <div className="email-editor-config-properties">
            <div className="email-editor-config-property">
              <SelectField.Root
                size="sm"
                value={selectedLevel.toString()}
                onValueChange={onLevelChange}
              >
                <SelectField.Label>Heading Level</SelectField.Label>
                <SelectField.Trigger placeholder="Select heading" />
                <SelectField.Content>
                  {HEADING_OPTIONS.map((option) => (
                    <SelectField.Item key={option.value} value={option.value}>
                      {option.label}
                    </SelectField.Item>
                  ))}
                </SelectField.Content>
              </SelectField.Root>
            </div>

            <div className="email-editor-config-property">
              <ColorField.Root
                size="sm"
                value={color}
                label="Text Color"
                onChange={onColorChange}
              />
            </div>

            <div className="email-editor-config-property">
              <TextField.Root
                size="sm"
                value={fontSizeNumeric}
                onChange={onFontSizeChange}
                placeholder="16"
              >
                <TextField.Label>Font Size</TextField.Label>
                <TextField.Slot side="right">px</TextField.Slot>
              </TextField.Root>
            </div>

            <div className="email-editor-config-property">
              <SpacingInput
                label="Margin"
                values={marginValues}
                onChange={onMarginChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
