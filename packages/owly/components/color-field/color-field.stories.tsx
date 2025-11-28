import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as ColorField from "./color-field";

import "./color-field.css";
import "../text-field/text-field.css";
import "../popover/popover.css";

const meta: Meta<typeof ColorField> = {
  title: "Components/ColorField",
};

type ColorFieldStoryFn = StoryFn<typeof ColorField>;

export const Default: ColorFieldStoryFn = () => {
  const [color, setColor] = React.useState("#3B82F6");

  return (
    <div style={{ padding: "100px" }}>
      <ColorField.Root
        value={color}
        onChange={setColor}
        placeholder="Enter hex color"
      />
    </div>
  );
};

export const WithLabel: ColorFieldStoryFn = () => {
  const [color, setColor] = React.useState("#10B981");

  return (
    <div style={{ padding: "100px" }}>
      <ColorField.Root
        value={color}
        onChange={setColor}
        label="Brand Color"
        placeholder="Enter hex color"
      />
    </div>
  );
};

export const WithHint: ColorFieldStoryFn = () => {
  const [color, setColor] = React.useState("#F59E0B");

  return (
    <div style={{ padding: "100px" }}>
      <ColorField.Root
        value={color}
        onChange={setColor}
        label="Accent Color"
        hint="Choose a color that complements your brand"
        placeholder="Enter hex color"
      />
    </div>
  );
};

export const WithError: ColorFieldStoryFn = () => {
  const [color, setColor] = React.useState("invalid-color");

  return (
    <div style={{ padding: "100px" }}>
      <ColorField.Root
        value={color}
        onChange={setColor}
        label="Background Color"
        error="Please enter a valid hex color (e.g., #FF0000)"
        placeholder="Enter hex color"
      />
    </div>
  );
};

export const EmptyState: ColorFieldStoryFn = () => {
  const [color, setColor] = React.useState("");

  return (
    <div style={{ padding: "100px" }}>
      <ColorField.Root
        value={color}
        onChange={setColor}
        label="Choose Color"
        placeholder="Enter hex color"
      />
    </div>
  );
};

export const Controlled: ColorFieldStoryFn = () => {
  const [color, setColor] = React.useState("#8B5CF6");
  const [log, setLog] = React.useState<string[]>([]);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setLog(prev => [...prev.slice(-4), `Color changed to: ${newColor}`]);
  };

  return (
    <div style={{ padding: "100px" }}>
      <div style={{ marginBottom: "var(--sp-lg)" }}>
        <ColorField.Root
          value={color}
          onChange={handleColorChange}
          onColorChange={(validColor) => {
            setLog(prev => [...prev.slice(-4), `Valid color: ${validColor}`]);
          }}
          label="Controlled Color Field"
          hint="Changes are logged below"
          placeholder="Enter hex color"
        />
      </div>

      <div style={{
        padding: "var(--sp-md)",
        backgroundColor: "var(--background-secondary)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-body-sm)"
      }}>
        <strong>Change Log:</strong>
        {log.length === 0 ? (
          <div style={{ color: "var(--content-tertiary)" }}>No changes yet</div>
        ) : (
          <ul style={{ margin: "var(--sp-xs) 0 0 0", padding: "0 0 0 var(--sp-lg)" }}>
            {log.map((entry, index) => (
              <li key={index} style={{ color: "var(--content-secondary)" }}>
                {entry}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const MultipleFields: ColorFieldStoryFn = () => {
  const [primaryColor, setPrimaryColor] = React.useState("#3B82F6");
  const [secondaryColor, setSecondaryColor] = React.useState("#10B981");
  const [accentColor, setAccentColor] = React.useState("#F59E0B");

  return (
    <div style={{ padding: "100px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-xl)", maxWidth: "400px" }}>
        <ColorField.Root
          value={primaryColor}
          onChange={setPrimaryColor}
          label="Primary Color"
          hint="Main brand color"
          placeholder="Enter hex color"
        />

        <ColorField.Root
          value={secondaryColor}
          onChange={setSecondaryColor}
          label="Secondary Color"
          hint="Supporting brand color"
          placeholder="Enter hex color"
        />

        <ColorField.Root
          value={accentColor}
          onChange={setAccentColor}
          label="Accent Color"
          hint="Highlight color for CTAs"
          placeholder="Enter hex color"
        />

        <div style={{
          marginTop: "var(--sp-lg)",
          padding: "var(--sp-lg)",
          backgroundColor: "var(--background-secondary)",
          borderRadius: "var(--radius-md)"
        }}>
          <h4 style={{ margin: "0 0 var(--sp-md) 0", fontSize: "var(--font-body-md)" }}>Color Preview</h4>
          <div style={{ display: "flex", gap: "var(--sp-md)" }}>
            <div style={{
              width: "60px",
              height: "40px",
              backgroundColor: primaryColor,
              borderRadius: "var(--radius-sm)",
              border: "var(--width-px) solid var(--border-tertiary)"
            }} />
            <div style={{
              width: "60px",
              height: "40px",
              backgroundColor: secondaryColor,
              borderRadius: "var(--radius-sm)",
              border: "var(--width-px) solid var(--border-tertiary)"
            }} />
            <div style={{
              width: "60px",
              height: "40px",
              backgroundColor: accentColor,
              borderRadius: "var(--radius-sm)",
              border: "var(--width-px) solid var(--border-tertiary)"
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const Sizes: ColorFieldStoryFn = () => {
  const [regularColor, setRegularColor] = React.useState("#3B82F6");
  const [smallColor, setSmallColor] = React.useState("#10B981");

  return (
    <div style={{ padding: "100px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-xl)", maxWidth: "400px" }}>
        <div>
          <h4 style={{ margin: "0 0 var(--sp-md) 0", fontSize: "var(--font-body-md)" }}>Regular Size (default)</h4>
          <ColorField.Root
            value={regularColor}
            onChange={setRegularColor}
            label="Regular Color Field"
            placeholder="Enter hex color"
          />
        </div>

        <div>
          <h4 style={{ margin: "0 0 var(--sp-md) 0", fontSize: "var(--font-body-md)" }}>Small Size</h4>
          <ColorField.Root
            size="sm"
            value={smallColor}
            onChange={setSmallColor}
            label="Small Color Field"
            placeholder="Enter hex color"
          />
        </div>
      </div>
    </div>
  );
};

export const InteractionTest: ColorFieldStoryFn = () => {
  const [color, setColor] = React.useState("#FF6B6B");

  return (
    <div style={{ padding: "100px" }}>
      <div style={{ marginBottom: "var(--sp-lg)" }}>
        <ColorField.Root
          value={color}
          onChange={setColor}
          label="Test Color Picker Interaction"
          hint="Click the color picker icon and try clicking on the color canvas - it should stay open"
          placeholder="Enter hex color"
        />
      </div>

      <div style={{
        padding: "var(--sp-md)",
        backgroundColor: "var(--background-secondary)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-body-sm)"
      }}>
        <strong>Current Color:</strong> {color}
        <div style={{
          marginTop: "var(--sp-sm)",
          width: "40px",
          height: "40px",
          backgroundColor: color,
          borderRadius: "var(--radius-sm)",
          border: "var(--width-px) solid var(--border-tertiary)"
        }} />
      </div>
    </div>
  );
};

export default meta;
