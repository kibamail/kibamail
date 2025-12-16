import { useContext, useState, useEffect } from "react";
import { EditorContext } from "@tiptap/react";
import type React from "react";
import {
  Button,
  DropdownMenu,
  ColorField,
  Text,
  TextField,
} from "@kibamail/owly";
// --- Contexts ---
import { useActiveNode } from "@/contexts/active-node-context";
import { SpacingInput } from "./spacing-input";

// --- Icons ---
import { Plus as PlusIcon, Minus as MinusIcon } from "iconoir-react";

const CSS_PROPERTIES = [
  { value: "backgroundColor", label: "Background Color", type: "color" },
  { value: "borderRadius", label: "Border Radius", type: "text" },
  { value: "padding", label: "Padding", type: "spacing" },
  { value: "margin", label: "Margin", type: "spacing" },
  { value: "color", label: "Text Color", type: "color" },
  { value: "fontSize", label: "Font Size", type: "text" },
  { value: "fontWeight", label: "Font Weight", type: "text" },
  { value: "border", label: "Border", type: "text" },
] as const;

/**
 * Parse a CSS spacing value (e.g., "10px 20px 10px 20px" or "10px") into individual sides
 */
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

/**
 * Combine individual spacing values into a CSS shorthand
 */
function combineSpacingValue(values: {
  top: string;
  right: string;
  bottom: string;
  left: string;
}): string {
  return `${values.top} ${values.right} ${values.bottom} ${values.left}`;
}

export function NodeStylesSection() {
  const { editor } = useContext(EditorContext)!;
  const { activeNode } = useActiveNode();
  const [localStyles, setLocalStyles] = useState<React.CSSProperties>({});

  // Initialize local state when activeNode changes
  useEffect(() => {
    if (activeNode) {
      const initialStyles = (activeNode.node.attrs.customStyle ||
        {}) as React.CSSProperties;
      setLocalStyles(initialStyles);
    } else {
      setLocalStyles({});
    }
  }, [activeNode]);

  function onAddProperty(property: string, propertyType: string) {
    if (!editor || !activeNode) return;

    const { node, pos } = activeNode;
    const defaultValue = propertyType === "color" ? "#ffffff" : "0px";

    const updatedStyles = {
      ...localStyles,
      [property]: defaultValue,
    };

    // Update local state
    setLocalStyles(updatedStyles);

    // Update editor without focusing
    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        customStyle: updatedStyles,
      });
      return true;
    });
  }

  function onUpdateProperty(property: string, value: string) {
    if (!editor || !activeNode) return;

    const { node, pos } = activeNode;

    const updatedStyles = {
      ...localStyles,
      [property]: value,
    };

    // Update local state
    setLocalStyles(updatedStyles);

    // Update editor without focusing
    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        customStyle: updatedStyles,
      });
      return true;
    });
  }

  function onRemoveProperty(property: string) {
    if (!editor || !activeNode) return;

    const { node, pos } = activeNode;
    const updatedStyles = { ...localStyles };

    delete updatedStyles[property as keyof React.CSSProperties];

    // Update local state
    setLocalStyles(updatedStyles);

    // Update editor without focusing
    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        customStyle: updatedStyles,
      });
      return true;
    });
  }

  if (!activeNode || !editor) {
    return null;
  }

  const availableProperties = CSS_PROPERTIES.filter(
    (prop) => !localStyles[prop.value as keyof React.CSSProperties]
  );

  const hasAdditionalProperties = availableProperties.length > 0;

  return (
    <div className="email-editor-config-section">
      <div className="email-editor-config-section-header">
        <Text size="lg" className="email-editor-config-section-header-title">
          Add custom styles
        </Text>
        <div className="email-editor-config-section-header-actions">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                size="xs"
                variant="secondary"
                disabled={!hasAdditionalProperties}
              >
                <PlusIcon />
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content align="end">
              {availableProperties.map((prop) => (
                <DropdownMenu.Item
                  key={prop.value}
                  onClick={() => onAddProperty(prop.value, prop.type)}
                >
                  {prop.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="email-editor-config-properties">
        {Object.entries(localStyles).length === 0 ? (
          <div className="email-editor-config-section-empty">
            <Text size="sm">No custom styles yet</Text>
          </div>
        ) : (
          Object.entries(localStyles).map(([property, value]) => {
            const propConfig = CSS_PROPERTIES.find((p) => p.value === property);
            const label = propConfig?.label || property;
            const inputType = propConfig?.type;

            if (inputType === "color") {
              return (
                <div key={property} className="email-editor-config-property">
                  <div className="email-editor-config-property-label-wrapper">
                    <Text
                      size="sm"
                      className="email-editor-config-property-label"
                    >
                      {label}
                    </Text>
                    <Button
                      variant="tertiary"
                      size="xs"
                      onClick={(event) => {
                        event.preventDefault();
                        onRemoveProperty(property);
                      }}
                    >
                      <MinusIcon />
                    </Button>
                  </div>
                  <ColorField.Root
                    size="sm"
                    value={String(value)}
                    onChange={(color) => onUpdateProperty(property, color)}
                  />
                </div>
              );
            }

            if (inputType === "spacing") {
              const spacingValues = parseSpacingValue(String(value));
              const handleSpacingChange = (
                side: "top" | "right" | "bottom" | "left",
                sideValue: string
              ) => {
                const newValues = { ...spacingValues, [side]: sideValue };
                onUpdateProperty(property, combineSpacingValue(newValues));
              };

              return (
                <div key={property} className="email-editor-config-property">
                  <div className="email-editor-config-property-label-wrapper">
                    <Text
                      size="sm"
                      className="email-editor-config-property-label"
                    >
                      {label}
                    </Text>
                    <Button
                      variant="tertiary"
                      size="xs"
                      onClick={(event) => {
                        event.preventDefault();
                        onRemoveProperty(property);
                      }}
                    >
                      <MinusIcon />
                    </Button>
                  </div>
                  <SpacingInput
                    label=""
                    values={spacingValues}
                    onChange={handleSpacingChange}
                  />
                </div>
              );
            }

            return (
              <div key={property} className="email-editor-config-property">
                <TextField.Root
                  size="sm"
                  value={String(value)}
                  onChange={(e) => onUpdateProperty(property, e.target.value)}
                >
                  <TextField.Label>
                    {label}
                    <Button
                      variant="tertiary"
                      size="xs"
                      onClick={(event) => {
                        event.preventDefault();
                        onRemoveProperty(property);
                      }}
                    >
                      <MinusIcon />
                    </Button>
                  </TextField.Label>
                </TextField.Root>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
