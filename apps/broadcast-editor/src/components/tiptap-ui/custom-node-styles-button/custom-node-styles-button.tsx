import { forwardRef, useState, useCallback, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as TiptapNode } from "@tiptap/pm/model";

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

// --- Owly Components ---
import { ColorField, TextField } from "@kibamail/owly";

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
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card";
import { Separator } from "@/components/tiptap-ui-primitive/separator";

// --- Components ---
import { SpacingInput } from "@/components/tiptap-templates/email-editor/spacing-input";

// --- Icons ---
import { FillColor as PaintBucketIcon } from "iconoir-react";

// --- Styles ---
import "./custom-node-styles-button.scss";

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

    // Handle popover open/close with explicit style sync
    const handleOpenChange = useCallback(
      (isOpen: boolean) => {
        if (isOpen && node) {
          // Sync styles from node when opening the popover
          const nodeStyles = (node.attrs?.customStyle || {}) as React.CSSProperties;
          console.log("[CustomNodeStylesButton] Opening popover", {
            nodeType: node.type.name,
            nodeAttrs: node.attrs,
            customStyle: node.attrs?.customStyle,
            nodeStyles,
          });
          setLocalStyles(nodeStyles);
        }
        setOpen(isOpen);
      },
      [node]
    );

    // Also sync when node changes while popover is open
    const customStyleKey = node?.attrs?.customStyle
      ? JSON.stringify(node.attrs.customStyle)
      : "";

    // Re-sync when customStyle content changes while popover is open
    useEffect(() => {
      if (open && node) {
        const initialStyles = (node.attrs.customStyle ||
          {}) as React.CSSProperties;
        setLocalStyles(initialStyles);
      }
    }, [open, node, customStyleKey]);

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
      <Popover open={open} onOpenChange={handleOpenChange}>
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
                <div className="custom-node-styles-section">
                  <ColorField.Root
                    size="sm"
                    label="Text Color"
                    value={(localStyles.color as string) || "#000000"}
                    onChange={(value) => handleStyleChange("color", value)}
                  />
                </div>

                <Separator orientation="horizontal" />

                <div className="custom-node-styles-section">
                  <ColorField.Root
                    size="sm"
                    label="Background Color"
                    value={(localStyles.backgroundColor as string) || "#ffffff"}
                    onChange={(value) =>
                      handleStyleChange("backgroundColor", value)
                    }
                  />
                </div>

                <Separator orientation="horizontal" />

                <div className="custom-node-styles-section">
                  <TextField.Root
                    size="sm"
                    value={((localStyles.fontSize as string) || "").replace(/[^0-9]/g, "")}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      handleStyleChange("fontSize", value ? `${value}px` : "");
                    }}
                    placeholder="16"
                  >
                    <TextField.Label>Font Size</TextField.Label>
                    <TextField.Slot side="right">px</TextField.Slot>
                  </TextField.Root>
                </div>

                <Separator orientation="horizontal" />

                <div className="custom-node-styles-section">
                  <SpacingInput
                    label="Padding"
                    values={parseSpacingValue(localStyles.padding as string)}
                    onChange={(side, value) => {
                      const currentValues = parseSpacingValue(localStyles.padding as string);
                      const newValues = { ...currentValues, [side]: value };
                      handleStyleChange("padding", combineSpacingValue(newValues));
                    }}
                  />
                </div>

                <Separator orientation="horizontal" />

                <div className="custom-node-styles-section">
                  <SpacingInput
                    label="Margin"
                    values={parseSpacingValue(localStyles.margin as string)}
                    onChange={(side, value) => {
                      const currentValues = parseSpacingValue(localStyles.margin as string);
                      const newValues = { ...currentValues, [side]: value };
                      handleStyleChange("margin", combineSpacingValue(newValues));
                    }}
                  />
                </div>
              </CardItemGroup>
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>
    );
  }
);

CustomNodeStylesButton.displayName = "CustomNodeStylesButton";
