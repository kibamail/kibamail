"use client";

import { useEffect, useState, useCallback } from "react";
import { type Editor } from "@tiptap/react";
import type { Node as TiptapNode } from "@tiptap/pm/model";
import { autoUpdate } from "@floating-ui/react";

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

// --- UI Components ---
import { FloatingElement } from "@/components/tiptap-ui-utils/floating-element";
import {
  Toolbar,
  ToolbarGroup,
} from "@/components/tiptap-ui-primitive/toolbar";
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
import { Input, InputGroup } from "@/components/tiptap-ui-primitive/input";
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Separator } from "@/components/tiptap-ui-primitive/separator";

// --- Icons ---
import {
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  Link as LinkIcon,
  Trash as TrashIcon,
  CornerBottomLeft as CornerDownLeftIcon,
  OpenNewWindow as ExternalLinkIcon,
  CodeBrackets as BracesIcon,
  Expand as MoveHorizontalIcon,
} from "iconoir-react";

// --- Contexts ---
import { useVariables } from "@/contexts/variables-context";

// --- Tiptap UI ---
import { CustomNodeStylesButton } from "@/components/tiptap-ui/custom-node-styles-button";

// --- Lib ---
import { sanitizeUrl } from "@/lib/tiptap-utils";

// --- Styles ---
import "./button-cursor-floating.scss";

export interface ButtonCursorFloatingProps {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
}

export function ButtonCursorFloating({
  editor: providedEditor,
}: ButtonCursorFloatingProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const [shouldShow, setShouldShow] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [buttonNodeData, setButtonNodeData] = useState<{
    node: TiptapNode;
    pos: number;
  } | null>(null);
  const { linkVariables } = useVariables();

  // Custom function to get cursor position instead of selection bounds
  const getCursorBoundingRect = useCallback((): DOMRect | null => {
    if (!editor) return null;

    const { selection } = editor.state;
    const { $from: _ } = selection;

    // Get the DOM coordinates of the cursor position
    const coords = editor.view.coordsAtPos(selection.from);

    if (!coords) return null;

    // Create a proper DOMRect at the cursor position
    return new DOMRect(
      coords.left,
      coords.top,
      2, // width
      coords.bottom - coords.top // height
    );
  }, [editor]);

  const getButtonNodeData = useCallback(
    (editor: Editor | null): { node: TiptapNode; pos: number } | null => {
      if (!editor) return null;

      const { selection } = editor.state;
      const { $from } = selection;

      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === "button") {
          const pos = depth === 0 ? 0 : $from.before(depth);
          return { node, pos };
        }
      }

      return null;
    },
    []
  );

  // Get current button href when popover opens
  const handleLinkPopoverOpen = useCallback(
    (open: boolean) => {
      if (open && editor) {
        const href = editor.getAttributes("button").href || "";
        setLinkUrl(href);
      }
      setLinkPopoverOpen(open);
    },
    [editor]
  );

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setButtonHref(linkUrl || undefined)
      .run();
    setLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  const handleRemoveLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setButtonHref(undefined).run();
    setLinkUrl("");
    setLinkPopoverOpen(false);
  }, [editor]);

  const handleOpenLink = useCallback(() => {
    if (!linkUrl) return;
    const safeUrl = sanitizeUrl(linkUrl, window.location.href);
    if (safeUrl !== "#") {
      window.open(safeUrl, "_blank", "noopener,noreferrer");
    }
  }, [linkUrl]);

  const handleVariableSelect = useCallback((variableName: string) => {
    setLinkUrl(`{{${variableName}}}`);
    setVariablesOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSetLink();
      }
    },
    [handleSetLink]
  );

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const nodeData = getButtonNodeData(editor);
      if (nodeData) {
        console.log("[ButtonCursorFloating] Got button node:", {
          nodeType: nodeData.node.type.name,
          nodeAttrs: nodeData.node.attrs,
          customStyle: nodeData.node.attrs.customStyle,
          pos: nodeData.pos,
        });
      }
      setShouldShow(nodeData !== null);
      setButtonNodeData(nodeData);
    };

    handleSelectionUpdate();

    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("transaction", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("transaction", handleSelectionUpdate);
    };
  }, [editor, getButtonNodeData]);

  if (!editor) return null;

  const currentHref = editor.getAttributes("button").href;
  const hasLink = !!currentHref;

  return (
    <FloatingElement
      zIndex={60}
      editor={editor}
      shouldShow={shouldShow}
      getBoundingClientRect={getCursorBoundingRect}
      className="button-cursor-floating"
      floatingOptions={{
        whileElementsMounted: (referenceEl, floatingEl, update) => {
          const cleanup = autoUpdate(referenceEl, floatingEl, update, {
            ancestorScroll: true,
            ancestorResize: true,
            elementResize: true,
            layoutShift: true,
            animationFrame: true,
          });

          if (editor) {
            const handleEditorUpdate = () => {
              update();
            };

            editor.on("selectionUpdate", handleEditorUpdate);
            editor.on("transaction", handleEditorUpdate);

            return () => {
              cleanup();
              editor.off("selectionUpdate", handleEditorUpdate);
              editor.off("transaction", handleEditorUpdate);
            };
          }

          return cleanup;
        },
      }}
    >
      <Toolbar variant="floating">
        <ToolbarGroup>
          <Button
            type="button"
            data-style="ghost"
            tabIndex={-1}
            tooltip="Align Left"
            data-active-state={
              editor.getAttributes("button").align === "left" ? "on" : "off"
            }
            onClick={() => editor.chain().focus().setButtonAlign("left").run()}
          >
            <AlignLeftIcon className="tiptap-button-icon" />
          </Button>

          <Button
            type="button"
            data-style="ghost"
            tabIndex={-1}
            tooltip="Align Center"
            data-active-state={
              editor.getAttributes("button").align === "center" ? "on" : "off"
            }
            onClick={() => {
              return editor.chain().focus().setButtonAlign("center").run();
            }}
          >
            <AlignCenterIcon className="tiptap-button-icon" />
          </Button>

          <Button
            type="button"
            data-style="ghost"
            role="button"
            tabIndex={-1}
            tooltip="Align Right"
            data-active-state={
              editor.getAttributes("button").align === "right" ? "on" : "off"
            }
            onClick={() => editor.chain().focus().setButtonAlign("right").run()}
          >
            <AlignRightIcon className="tiptap-button-icon" />
          </Button>

          <Button
            type="button"
            data-style="ghost"
            role="button"
            tabIndex={-1}
            tooltip="Full Width"
            data-active-state={
              editor.getAttributes("button").fullWidth ? "on" : "off"
            }
            onClick={() => {
              const currentFullWidth = editor.getAttributes("button").fullWidth;
              editor
                .chain()
                .focus()
                .setButtonFullWidth(!currentFullWidth)
                .run();
            }}
          >
            <MoveHorizontalIcon className="tiptap-button-icon" />
          </Button>

          <CustomNodeStylesButton
            editor={editor}
            node={buttonNodeData?.node}
            nodePos={buttonNodeData?.pos}
            popoverSide="top"
          />
        </ToolbarGroup>

        <Separator />

        <ToolbarGroup>
          <Popover open={linkPopoverOpen} onOpenChange={handleLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                data-style="ghost"
                role="button"
                tabIndex={-1}
                tooltip="Add Link"
                data-active-state={hasLink ? "on" : "off"}
              >
                <LinkIcon className="tiptap-button-icon" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={8}>
              <Card>
                <CardBody>
                  <CardItemGroup orientation="horizontal">
                    <InputGroup>
                      <Input
                        type="url"
                        placeholder="Paste a link..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                      />
                    </InputGroup>

                    <ButtonGroup orientation="horizontal">
                      <Button
                        type="button"
                        onClick={handleSetLink}
                        title="Apply link"
                        disabled={!linkUrl}
                        data-style="ghost"
                      >
                        <CornerDownLeftIcon className="tiptap-button-icon" />
                      </Button>
                    </ButtonGroup>

                    <Separator />

                    {linkVariables.length > 0 && (
                      <>
                        <ButtonGroup orientation="horizontal">
                          <Popover
                            open={variablesOpen}
                            onOpenChange={setVariablesOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                title="Insert variable"
                                data-style="ghost"
                                data-active-state={variablesOpen ? "on" : "off"}
                              >
                                <BracesIcon className="tiptap-button-icon" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              side="top"
                              align="start"
                              sideOffset={8}
                            >
                              <Card>
                                <CardBody>
                                  <ButtonGroup orientation="vertical">
                                    {linkVariables.map((variable) => (
                                      <Button
                                        key={variable}
                                        type="button"
                                        data-style="ghost"
                                        onClick={() =>
                                          handleVariableSelect(variable)
                                        }
                                        style={{ justifyContent: "flex-start" }}
                                      >
                                        <span>{variable}</span>
                                      </Button>
                                    ))}
                                  </ButtonGroup>
                                </CardBody>
                              </Card>
                            </PopoverContent>
                          </Popover>
                        </ButtonGroup>

                        <Separator />
                      </>
                    )}

                    <ButtonGroup orientation="horizontal">
                      <Button
                        type="button"
                        onClick={handleOpenLink}
                        title="Open in new window"
                        disabled={!linkUrl}
                        data-style="ghost"
                      >
                        <ExternalLinkIcon className="tiptap-button-icon" />
                      </Button>

                      <Button
                        type="button"
                        onClick={handleRemoveLink}
                        title="Remove link"
                        disabled={!linkUrl && !hasLink}
                        data-style="ghost"
                      >
                        <TrashIcon className="tiptap-button-icon" />
                      </Button>
                    </ButtonGroup>
                  </CardItemGroup>
                </CardBody>
              </Card>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            data-style="ghost"
            role="button"
            tabIndex={-1}
            tooltip="Delete Button"
            onClick={() => {
              const { selection } = editor.state;
              const { $from } = selection;

              // Find the button node and its position
              for (let depth = $from.depth; depth >= 0; depth--) {
                const node = $from.node(depth);
                if (node.type.name === "button") {
                  const pos = depth === 0 ? 0 : $from.before(depth);
                  const nodeSize = node.nodeSize;

                  // Delete the entire button node
                  editor
                    .chain()
                    .focus()
                    .deleteRange({ from: pos, to: pos + nodeSize })
                    .run();
                  return;
                }
              }

              // Fallback: if we can't find the button node, use deleteSelection
              editor.chain().focus().deleteSelection().run();
            }}
          >
            <TrashIcon className="tiptap-button-icon" />
          </Button>
        </ToolbarGroup>
      </Toolbar>
    </FloatingElement>
  );
}
