import { useState } from "react";
import { useEditorConfig, type SimpleStyleKey } from "@/contexts/editor-config-context";
import {
  Button,
  DropdownMenu,
  ColorField,
  Text,
  TextField,
} from "@kibamail/owly";
import { Plus as PlusIcon, Minus as MinusIcon } from "iconoir-react";

// Available CSS properties that can be added
const CSS_PROPERTIES = [
  { value: "backgroundColor", label: "Background Color", type: "color" },
  { value: "borderRadius", label: "Border Radius", type: "text" },
  { value: "padding", label: "Padding", type: "text" },
  { value: "margin", label: "Margin", type: "text" },
] as const;

interface ConfigSectionProps {
  /**
   * The type of editor config (body, container, etc.)
   */
  type: SimpleStyleKey;

  /**
   * Display title for the section
   */
  title: string;
}

export function ConfigSection({ type, title }: ConfigSectionProps) {
  const { getStyles, updateStyleProperty, removeStyleProperty } =
    useEditorConfig();
  const [_showDropdown, setShowDropdown] = useState(false);
  const currentStyles = getStyles(type) || {};

  const handleAddProperty = (property: string, propertyType: string) => {
    // Add property with a default value
    const defaultValue = propertyType === "color" ? "#ffffff" : "0px";
    updateStyleProperty(type, property, defaultValue);
    setShowDropdown(false);
  };

  const handleUpdateProperty = (property: string, value: string) => {
    updateStyleProperty(type, property, value);
  };

  const handleRemoveProperty = (property: string) => {
    removeStyleProperty(type, property);
  };

  // Get properties that haven't been added yet
  const availableProperties = CSS_PROPERTIES.filter(
    (prop) => !(prop.value in currentStyles)
  );

  const hasAdditionalProperties = availableProperties.length > 0;

  return (
    <div className="email-editor-config-section">
      <div className="email-editor-config-section-header">
        <Text size="lg" className="email-editor-config-section-header-title">
          {title}
        </Text>
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
                onClick={() => handleAddProperty(prop.value, prop.type)}
              >
                {prop.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <div className="email-editor-config-properties">
        {Object.entries(currentStyles).map(([property, value]) => {
          const propConfig = CSS_PROPERTIES.find((p) => p.value === property);
          const label = propConfig?.label || property;
          const inputType = propConfig?.type; // todo, use prop config.type to render correct input

          if (inputType === "color") {
            return (
              <div key={property} className="email-editor-config-property">
                <ColorField.Root
                  value={value}
                  label={label}
                  onChange={(color) => handleUpdateProperty(property, color)}
                ></ColorField.Root>
              </div>
            );
          }

          return (
            <div key={property} className="email-editor-config-property">
              <TextField.Root
                value={value}
                onChange={(e) => handleUpdateProperty(property, e.target.value)}
              >
                <TextField.Label>
                  {label}

                  <Button
                    variant="tertiary"
                    size="xs"
                    onClick={(event) => {
                      event.preventDefault();
                      handleRemoveProperty(property);
                    }}
                  >
                    <MinusIcon />
                  </Button>
                </TextField.Label>
              </TextField.Root>
            </div>
          );
        })}
      </div>
    </div>
  );
}
