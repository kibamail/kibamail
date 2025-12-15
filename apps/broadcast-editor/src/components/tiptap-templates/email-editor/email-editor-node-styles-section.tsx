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

// --- Icons ---
import { Plus as PlusIcon, Minus as MinusIcon } from "iconoir-react";

const CSS_PROPERTIES = [
  { value: "backgroundColor", label: "Background Color", type: "color" },
  { value: "borderRadius", label: "Border Radius", type: "text" },
  { value: "padding", label: "Padding", type: "text" },
  { value: "margin", label: "Margin", type: "text" },
  { value: "color", label: "Text Color", type: "color" },
  { value: "fontSize", label: "Font Size", type: "text" },
  { value: "fontWeight", label: "Font Weight", type: "text" },
  { value: "border", label: "Border", type: "text" },
] as const;

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
                  <div>
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
                      value={String(value)}
                      onChange={(color) => onUpdateProperty(property, color)}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={property} className="email-editor-config-property">
                <TextField.Root
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
