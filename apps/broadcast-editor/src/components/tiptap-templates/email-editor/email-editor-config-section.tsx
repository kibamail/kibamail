import { useCallback, useState } from "react";
import {
  useEditorConfig,
  type SimpleStyleKey,
} from "@/contexts/editor-config-context";
import { ColorField, Text, TextField } from "@kibamail/owly";
import { NavArrowDown } from "iconoir-react";
import { SpacingInput } from "./spacing-input";
import "./spacing-input.scss";

/**
 * Available properties that can be configured
 */
export type ConfigurableProperty =
  | "backgroundColor"
  | "padding"
  | "margin"
  | "borderRadius"
  | "borderWidth"
  | "borderColor"
  | "fontSize"
  | "color";

interface ConfigSectionProps {
  /**
   * The type of editor config (body, container, etc.)
   */
  type: SimpleStyleKey;

  /**
   * Display title for the section
   */
  title: string;

  /**
   * Which properties to show for this section
   */
  properties?: ConfigurableProperty[];

  /**
   * Whether the section is expanded by default
   */
  defaultExpanded?: boolean;
}

/**
 * Get individual spacing values from style properties
 */
function getSpacingValues(
  styles: React.CSSProperties,
  prefix: "padding" | "margin"
): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  return {
    top: (styles[`${prefix}Top` as keyof React.CSSProperties] as string) || "0px",
    right: (styles[`${prefix}Right` as keyof React.CSSProperties] as string) || "0px",
    bottom: (styles[`${prefix}Bottom` as keyof React.CSSProperties] as string) || "0px",
    left: (styles[`${prefix}Left` as keyof React.CSSProperties] as string) || "0px",
  };
}

const DEFAULT_PROPERTIES: ConfigurableProperty[] = [
  "backgroundColor",
  "padding",
  "margin",
  "borderRadius",
];

export function ConfigSection({
  type,
  title,
  properties = DEFAULT_PROPERTIES,
  defaultExpanded = false,
}: ConfigSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { getStyles, updateStyleProperty } = useEditorConfig();
  const currentStyles = getStyles(type) || {};

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const backgroundColor =
    (currentStyles.backgroundColor as string) || "#ffffff";
  const borderRadius = (currentStyles.borderRadius as string) || "0px";
  const borderWidth = (currentStyles.borderWidth as string) || "0px";
  const borderColor = (currentStyles.borderColor as string) || "#000000";
  const fontSize = (currentStyles.fontSize as string) || "16px";
  const color = (currentStyles.color as string) || "#000000";
  const paddingValues = getSpacingValues(currentStyles, "padding");
  const marginValues = getSpacingValues(currentStyles, "margin");

  const handleBackgroundColorChange = useCallback(
    (color: string) => {
      updateStyleProperty(type, "backgroundColor", color);
    },
    [type, updateStyleProperty]
  );

  const handleBorderRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^0-9]/g, "");
      updateStyleProperty(type, "borderRadius", value ? `${value}px` : "0px");
    },
    [type, updateStyleProperty]
  );

  const handleBorderWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^0-9]/g, "");
      updateStyleProperty(type, "borderWidth", value ? `${value}px` : "0px");
      // Also set borderStyle to solid when width > 0
      if (value && parseInt(value) > 0) {
        updateStyleProperty(type, "borderStyle", "solid");
      }
    },
    [type, updateStyleProperty]
  );

  const handleBorderColorChange = useCallback(
    (newColor: string) => {
      updateStyleProperty(type, "borderColor", newColor);
    },
    [type, updateStyleProperty]
  );

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^0-9]/g, "");
      updateStyleProperty(type, "fontSize", value ? `${value}px` : "16px");
    },
    [type, updateStyleProperty]
  );

  const handleColorChange = useCallback(
    (newColor: string) => {
      updateStyleProperty(type, "color", newColor);
    },
    [type, updateStyleProperty]
  );

  const handlePaddingChange = useCallback(
    (side: "top" | "right" | "bottom" | "left", value: string) => {
      const propertyName = `padding${side.charAt(0).toUpperCase()}${side.slice(1)}`;
      updateStyleProperty(type, propertyName, value);
    },
    [type, updateStyleProperty]
  );

  const handleMarginChange = useCallback(
    (side: "top" | "right" | "bottom" | "left", value: string) => {
      const propertyName = `margin${side.charAt(0).toUpperCase()}${side.slice(1)}`;
      updateStyleProperty(type, propertyName, value);
    },
    [type, updateStyleProperty]
  );

  const borderRadiusNumeric = borderRadius.replace(/[^0-9]/g, "");
  const borderWidthNumeric = borderWidth.replace(/[^0-9]/g, "");
  const fontSizeNumeric = fontSize.replace(/[^0-9]/g, "");

  const showProperty = (prop: ConfigurableProperty) => properties.includes(prop);

  return (
    <div className={`email-editor-config-section ${isExpanded ? "email-editor-config-section-expanded" : ""}`}>
      <button
        type="button"
        className="email-editor-config-section-header"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        <Text size="lg" className="email-editor-config-section-header-title">
          {title}
        </Text>
        <NavArrowDown className="email-editor-config-section-arrow" />
      </button>

      <div className={`email-editor-config-section-content ${isExpanded ? "email-editor-config-section-content-expanded" : ""}`}>
        <div className="email-editor-config-section-content-inner">
          <div className="email-editor-config-properties">
            {showProperty("backgroundColor") && (
              <div className="email-editor-config-property">
                <ColorField.Root
                  size="sm"
                  value={backgroundColor}
                  label="Background Color"
                  onChange={handleBackgroundColorChange}
                />
              </div>
            )}

            {showProperty("color") && (
              <div className="email-editor-config-property">
                <ColorField.Root
                  size="sm"
                  value={color}
                  label="Text Color"
                  onChange={handleColorChange}
                />
              </div>
            )}

            {showProperty("fontSize") && (
              <div className="email-editor-config-property">
                <TextField.Root
                  size="sm"
                  value={fontSizeNumeric}
                  onChange={handleFontSizeChange}
                  placeholder="16"
                >
                  <TextField.Label>Font Size</TextField.Label>
                  <TextField.Slot side="right">px</TextField.Slot>
                </TextField.Root>
              </div>
            )}

            {showProperty("borderRadius") && (
              <div className="email-editor-config-property">
                <TextField.Root
                  size="sm"
                  value={borderRadiusNumeric}
                  onChange={handleBorderRadiusChange}
                  placeholder="0"
                >
                  <TextField.Label>Border Radius</TextField.Label>
                  <TextField.Slot side="right">px</TextField.Slot>
                </TextField.Root>
              </div>
            )}

            {showProperty("borderWidth") && (
              <div className="email-editor-config-property">
                <TextField.Root
                  size="sm"
                  value={borderWidthNumeric}
                  onChange={handleBorderWidthChange}
                  placeholder="0"
                >
                  <TextField.Label>Border Width</TextField.Label>
                  <TextField.Slot side="right">px</TextField.Slot>
                </TextField.Root>
              </div>
            )}

            {showProperty("borderColor") && (
              <div className="email-editor-config-property">
                <ColorField.Root
                  size="sm"
                  value={borderColor}
                  label="Border Color"
                  onChange={handleBorderColorChange}
                />
              </div>
            )}

            {showProperty("padding") && (
              <div className="email-editor-config-property">
                <SpacingInput
                  label="Padding"
                  values={paddingValues}
                  onChange={handlePaddingChange}
                />
              </div>
            )}

            {showProperty("margin") && (
              <div className="email-editor-config-property">
                <SpacingInput
                  label="Margin"
                  values={marginValues}
                  onChange={handleMarginChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
