import { useCallback } from "react";
import { TextField } from "@kibamail/owly";
import {
  BorderTop,
  BorderBottom,
  BorderLeft,
  BorderRight,
} from "iconoir-react";
import "./spacing-input.scss";

interface SpacingInputProps {
  /**
   * Label for the spacing input (e.g., "Padding", "Margin")
   */
  label: string;

  /**
   * Current values for each side
   */
  values: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };

  /**
   * Callback when any value changes
   */
  onChange: (side: "top" | "right" | "bottom" | "left", value: string) => void;
}

interface SideInputProps {
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}

function SideInput({ value, onChange, icon }: SideInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, "");
      onChange(rawValue ? `${rawValue}px` : "0px");
    },
    [onChange]
  );

  const numericValue = value.replace(/[^0-9]/g, "");

  return (
    <TextField.Root
      value={numericValue}
      onChange={handleChange}
      placeholder="0"
      size="sm"
    >
      <TextField.Slot side="left">{icon}</TextField.Slot>
      <TextField.Slot side="right">px</TextField.Slot>
    </TextField.Root>
  );
}

export function SpacingInput({ label, values, onChange }: SpacingInputProps) {
  const handleSideChange = useCallback(
    (side: "top" | "right" | "bottom" | "left") => (value: string) => {
      onChange(side, value);
    },
    [onChange]
  );

  return (
    <div className="spacing-input">
      <span className="spacing-input-label">{label}</span>
      <div className="spacing-input-grid">
        <div className="spacing-input-side-top">
          <SideInput
            value={values.top}
            onChange={handleSideChange("top")}
            icon={<BorderTop className="w-3 h-3" />}
          />
        </div>
        <div className="spacing-input-side-left">
          <SideInput
            value={values.left}
            onChange={handleSideChange("left")}
            icon={<BorderLeft className="w-3 h-3" />}
          />
        </div>
        <div className="spacing-input-side-right">
          <SideInput
            value={values.right}
            onChange={handleSideChange("right")}
            icon={<BorderRight className="w-3 h-3" />}
          />
        </div>
        <div className="spacing-input-side-bottom">
          <SideInput
            value={values.bottom}
            onChange={handleSideChange("bottom")}
            icon={<BorderBottom className="w-3 h-3" />}
          />
        </div>
      </div>
    </div>
  );
}
