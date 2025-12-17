import { TextField } from "@kibamail/owly";
import {
  BorderTop,
  BorderBottom,
  BorderLeft,
  BorderRight,
} from "iconoir-react";
import "./spacing-input.scss";

interface SpacingInputProps {
  label: string;
  values: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  onChange: (side: "top" | "right" | "bottom" | "left", value: string) => void;
}

interface SideInputProps {
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}

function SideInput({ value, onChange, icon }: SideInputProps) {
  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value.replace(/[^0-9]/g, "");
    onChange(rawValue ? `${rawValue}px` : "0px");
  }

  const numericValue = value.replace(/[^0-9]/g, "");

  return (
    <TextField.Root
      value={numericValue}
      onChange={onInputChange}
      placeholder="0"
      size="sm"
    >
      <TextField.Slot side="left">{icon}</TextField.Slot>
      <TextField.Slot side="right">px</TextField.Slot>
    </TextField.Root>
  );
}

export function SpacingInput({ label, values, onChange }: SpacingInputProps) {
  function onSideChange(side: "top" | "right" | "bottom" | "left") {
    return (value: string) => {
      onChange(side, value);
    };
  }

  return (
    <div className="spacing-input">
      <span className="spacing-input-label">{label}</span>
      <div className="spacing-input-grid">
        <div className="spacing-input-side-top">
          <SideInput
            value={values.top}
            onChange={onSideChange("top")}
            icon={<BorderTop className="w-3 h-3" />}
          />
        </div>
        <div className="spacing-input-side-left">
          <SideInput
            value={values.left}
            onChange={onSideChange("left")}
            icon={<BorderLeft className="w-3 h-3" />}
          />
        </div>
        <div className="spacing-input-side-right">
          <SideInput
            value={values.right}
            onChange={onSideChange("right")}
            icon={<BorderRight className="w-3 h-3" />}
          />
        </div>
        <div className="spacing-input-side-bottom">
          <SideInput
            value={values.bottom}
            onChange={onSideChange("bottom")}
            icon={<BorderBottom className="w-3 h-3" />}
          />
        </div>
      </div>
    </div>
  );
}
