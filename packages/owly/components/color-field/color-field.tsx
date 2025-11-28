"use client";

import cn from "classnames";
import * as React from "react";
import { HexColorPicker } from "react-colorful";
import * as TextField from "../text-field/text-field";
import type { TextFieldProps } from "../text-field/text-field";
import * as Popover from "../popover/popover";

// Helper functions for color conversion
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

function normalizeHex(hex: string): string {
  if (!hex.startsWith("#")) {
    hex = "#" + hex;
  }
  if (hex.length === 4) {
    // Convert #RGB to #RRGGBB
    hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toUpperCase();
}

// Color preview component
interface ColorPreviewProps {
  color?: string;
  className?: string;
}

const ColorPreview: React.FC<ColorPreviewProps> = ({ color, className }) => {
  return (
    <div
      className={cn("kb-color-field-preview", className)}
      style={{
        backgroundColor: color || "transparent",
      }}
    />
  );
};

// Main ColorField component
export interface ColorFieldProps
  extends Omit<
    TextFieldProps,
    "children" | "value" | "onChange"
  > {
  value?: string;
  onChange?: (value: string) => void;
  onColorChange?: (color: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  popoverSideOffset?: number;
}

const ColorFieldRoot = React.forwardRef<
  React.ElementRef<"input">,
  ColorFieldProps
>((props, forwardedRef) => {
  const {
    value = "",
    onChange,
    onColorChange,
    placeholder = "Enter hex color",
    label,
    hint,
    error,
    popoverSideOffset = 4,
    className,
    ...textFieldProps
  } = props;

  const [internalValue, setInternalValue] = React.useState(value);
  const [rgbValues, setRgbValues] = React.useState({ r: 0, g: 0, b: 0 });

  // Update internal state when value prop changes
  React.useEffect(() => {
    setInternalValue(value);
    if (isValidHex(value)) {
      const rgb = hexToRgb(value);
      if (rgb) {
        setRgbValues(rgb);
      }
    }
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);

    if (isValidHex(newValue)) {
      const normalizedHex = normalizeHex(newValue);
      const rgb = hexToRgb(normalizedHex);
      if (rgb) {
        setRgbValues(rgb);
        onColorChange?.(normalizedHex);
      }
    }
  };

  const handleColorPickerChange = (color: string) => {
    const normalizedColor = normalizeHex(color);
    setInternalValue(normalizedColor);
    onChange?.(normalizedColor);
    onColorChange?.(normalizedColor);

    const rgb = hexToRgb(normalizedColor);
    if (rgb) {
      setRgbValues(rgb);
    }
  };

  const handleRgbChange = (component: "r" | "g" | "b", newValue: string) => {
    const numValue = Math.max(0, Math.min(255, parseInt(newValue) || 0));
    const newRgb = { ...rgbValues, [component]: numValue };
    setRgbValues(newRgb);

    const hexColor = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setInternalValue(hexColor);
    onChange?.(hexColor);
    onColorChange?.(hexColor);
  };

  const displayColor = isValidHex(internalValue)
    ? normalizeHex(internalValue)
    : undefined;

  return (
    <TextField.TextFieldRoot
      {...textFieldProps}
      ref={forwardedRef}
      value={internalValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={cn("kb-color-field-root", className)}
    >
      {label && <TextField.TextFieldLabel>{label}</TextField.TextFieldLabel>}

      <TextField.TextFieldSlot side="left">
        <ColorPreview color={displayColor} />
      </TextField.TextFieldSlot>

      <TextField.TextFieldSlot side="right">
        <Popover.PopoverRoot>
          <Popover.PopoverTrigger asChild>
            <button
              type="button"
              className="kb-color-field-trigger"
              aria-label="Open color picker"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 2L10 4L6 8L4 6L8 2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 14L6 10L10 14H2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </Popover.PopoverTrigger>
          <Popover.PopoverContent
            sideOffset={popoverSideOffset}
            className="kb-color-field-popover"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="kb-color-field-picker-container">
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <HexColorPicker
                  color={displayColor || "#000000"}
                  onChange={handleColorPickerChange}
                  className="kb-color-field-picker"
                />
              </div>

              <div className="kb-color-field-inputs">
                <TextField.TextFieldRoot
                  value={internalValue}
                  onChange={handleInputChange}
                  placeholder="#000000"
                  className="kb-color-field-hex-input"
                >
                  <TextField.TextFieldSlot side="left">
                    <span className="kb-color-field-input-label">HEX</span>
                  </TextField.TextFieldSlot>
                </TextField.TextFieldRoot>

                <div className="kb-color-field-rgb-inputs">
                  {(["r", "g", "b"] as const).map((component) => (
                    <TextField.TextFieldRoot
                      key={component}
                      value={rgbValues[component].toString()}
                      onChange={(e) =>
                        handleRgbChange(component, e.target.value)
                      }
                      className="kb-color-field-rgb-input"
                    >
                      <TextField.TextFieldSlot side="left">
                        <span className="kb-color-field-input-label">
                          {component.toUpperCase()}
                        </span>
                      </TextField.TextFieldSlot>
                    </TextField.TextFieldRoot>
                  ))}
                </div>
              </div>
            </div>
          </Popover.PopoverContent>
        </Popover.PopoverRoot>
      </TextField.TextFieldSlot>

      {error && <TextField.TextFieldError>{error}</TextField.TextFieldError>}
      {hint && <TextField.TextFieldHint>{hint}</TextField.TextFieldHint>}
    </TextField.TextFieldRoot>
  );
});

ColorFieldRoot.displayName = "ColorField.Root";

export { ColorFieldRoot, ColorFieldRoot as Root };
