"use client";

import * as TextField from "@kibamail/owly/text-field";
import {
  BorderTop,
  BorderBottom,
  BorderLeft,
  BorderRight,
} from "iconoir-react";

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
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-kb-content-secondary">
        {label}
      </span>
      <div
        className="grid grid-cols-2 gap-2"
        style={{
          gridTemplateAreas: `"top right" "left bottom"`,
        }}
      >
        <div style={{ gridArea: "top" }}>
          <SideInput
            value={values.top}
            onChange={onSideChange("top")}
            icon={<BorderTop className="w-3 h-3" />}
          />
        </div>
        <div style={{ gridArea: "right" }}>
          <SideInput
            value={values.right}
            onChange={onSideChange("right")}
            icon={<BorderRight className="w-3 h-3" />}
          />
        </div>
        <div style={{ gridArea: "left" }}>
          <SideInput
            value={values.left}
            onChange={onSideChange("left")}
            icon={<BorderLeft className="w-3 h-3" />}
          />
        </div>
        <div style={{ gridArea: "bottom" }}>
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
