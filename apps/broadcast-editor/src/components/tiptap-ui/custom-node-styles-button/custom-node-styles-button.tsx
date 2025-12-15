import { forwardRef, useState, useCallback, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as TiptapNode } from "@tiptap/pm/model";

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card";
import { Input, InputGroup } from "@/components/tiptap-ui-primitive/input";
import { Separator } from "@/components/tiptap-ui-primitive/separator";

// --- Icons ---
import { FillColor as PaintBucketIcon } from "iconoir-react";

// --- Styles ---
import "./custom-node-styles-button.scss";

export interface CustomNodeStylesButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;

  /**
   * The current node
   */
  node?: TiptapNode | null;

  /**
   * The position of the node in the document
   */
  nodePos?: number;

  /**
   * Optional text to display alongside the icon.
   */
  text?: string;

  /**
   * Whether to hide the button when unavailable.
   * @default false
   */
  hideWhenUnavailable?: boolean;

  /**
   * Side of the popover relative to the trigger button.
   * @default "left"
   */
  popoverSide?: "top" | "right" | "bottom" | "left";
}

interface StyleSectionProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "color" | "text";
  placeholder?: string;
}

function StyleSection({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: StyleSectionProps) {
  if (type === "color") {
    return (
      <div className="custom-node-styles-section">
        <CardGroupLabel>{label}</CardGroupLabel>
        <div className="custom-node-styles-color-input">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="custom-node-styles-color-picker"
          />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "#000000"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="custom-node-styles-section">
      <CardGroupLabel>{label}</CardGroupLabel>
      <InputGroup>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </InputGroup>
    </div>
  );
}

/**
 * Button component with popover for custom node styles.
 * Provides controls for text color, background color, padding, and margin.
 */
export const CustomNodeStylesButton = forwardRef<
  HTMLButtonElement,
  CustomNodeStylesButtonProps
>(
  (
    {
      editor: providedEditor,
      node,
      nodePos,
      text,
      hideWhenUnavailable = false,
      popoverSide = "left",
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor);
    const [open, setOpen] = useState(false);
    const [localStyles, setLocalStyles] = useState<React.CSSProperties>({});

    // Initialize local state when node changes or popover opens
    useEffect(() => {
      if (open && node) {
        const initialStyles = (node.attrs.customStyle ||
          {}) as React.CSSProperties;
        setLocalStyles(initialStyles);
      }
    }, [open, node]);

    const updateNodeStyles = useCallback(
      (newStyles: React.CSSProperties) => {
        if (!editor || nodePos === undefined || nodePos < 0 || !node) return;

        editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(nodePos, undefined, {
            ...node.attrs,
            customStyle: newStyles,
          });
          return true;
        });
      },
      [editor, nodePos, node]
    );

    const handleStyleChange = useCallback(
      (property: keyof React.CSSProperties, value: string) => {
        const newStyles = { ...localStyles };

        if (value === "" || value === undefined) {
          delete newStyles[property];
        } else {
          (newStyles as Record<string, string>)[property as string] = value;
        }

        setLocalStyles(newStyles);
        updateNodeStyles(newStyles);
      },
      [localStyles, updateNodeStyles]
    );

    // Hide if editor is not available or not editable
    if (!editor || !editor.isEditable) {
      if (hideWhenUnavailable) {
        return null;
      }
    }

    const isDisabled = !editor || !editor.isEditable || !node;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            data-style="secondary"
            tabIndex={-1}
            disabled={isDisabled}
            data-disabled={isDisabled}
            aria-label="Custom node styles"
            tooltip="Custom node styles"
            {...buttonProps}
            ref={ref}
          >
            {children ?? (
              <>
                <PaintBucketIcon className="tiptap-button-icon" />
                {text && <span className="tiptap-button-text">{text}</span>}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side={popoverSide}
          align="start"
          sideOffset={8}
          className="custom-node-styles-popover"
        >
          <Card>
            <CardBody>
              <CardItemGroup>
                <StyleSection
                  label="Text Color"
                  value={(localStyles.color as string) || ""}
                  onChange={(value) => handleStyleChange("color", value)}
                  type="color"
                  placeholder="#000000"
                />

                <Separator orientation="horizontal" />

                <StyleSection
                  label="Background Color"
                  value={(localStyles.backgroundColor as string) || ""}
                  onChange={(value) =>
                    handleStyleChange("backgroundColor", value)
                  }
                  type="color"
                  placeholder="#ffffff"
                />

                <Separator orientation="horizontal" />

                <StyleSection
                  label="Padding"
                  value={(localStyles.padding as string) || ""}
                  onChange={(value) => handleStyleChange("padding", value)}
                  placeholder="e.g. 8px or 8px 16px"
                />

                <Separator orientation="horizontal" />

                <StyleSection
                  label="Margin"
                  value={(localStyles.margin as string) || ""}
                  onChange={(value) => handleStyleChange("margin", value)}
                  placeholder="e.g. 8px or 8px 16px"
                />
              </CardItemGroup>
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>
    );
  }
);

CustomNodeStylesButton.displayName = "CustomNodeStylesButton";
