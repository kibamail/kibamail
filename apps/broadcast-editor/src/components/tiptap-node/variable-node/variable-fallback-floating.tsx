"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { autoUpdate } from "@floating-ui/react";

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

// --- Lib ---
import { isNodeSelectionType } from "@/lib/tiptap-utils";

// --- UI Components ---
import { FloatingElement } from "@/components/tiptap-ui-utils/floating-element";
import { Card, CardBody, CardItemGroup } from "@/components/tiptap-ui-primitive/card";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Input, InputGroup } from "@/components/tiptap-ui-primitive/input";
import { Separator } from "@/components/tiptap-ui-primitive/separator";

// --- Icons ---
import { Trash as TrashIcon, CornerBottomLeft as CornerDownLeftIcon } from "iconoir-react";

export interface VariableFallbackFloatingProps {
  editor?: Editor | null;
}

export function VariableFallbackFloating({
  editor: providedEditor,
}: VariableFallbackFloatingProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const [shouldShow, setShouldShow] = useState(false);
  const [fallbackValue, setFallbackValue] = useState("");
  const [selectedNodePos, setSelectedNodePos] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInputFocusedRef = useRef(false);

  const getVariableNodeBoundingRect = useCallback((): DOMRect | null => {
    if (!editor) return null;

    const pos = isInputFocusedRef.current ? selectedNodePos : null;

    if (pos !== null) {
      const nodeDom = editor.view.nodeDOM(pos) as HTMLElement | null;
      if (nodeDom) {
        return nodeDom.getBoundingClientRect();
      }
    }

    const { selection } = editor.state;

    if (!isNodeSelectionType(selection)) return null;
    if (selection.node.type.name !== "variable") return null;

    const nodeDom = editor.view.nodeDOM(selection.from) as HTMLElement | null;
    if (!nodeDom) return null;

    return nodeDom.getBoundingClientRect();
  }, [editor, selectedNodePos]);

  const isVariableNodeSelected = useCallback(
    (editorInstance: Editor | null): { selected: boolean; fallback: string; pos: number | null } => {
      if (!editorInstance) return { selected: false, fallback: "", pos: null };

      const { selection } = editorInstance.state;

      if (!isNodeSelectionType(selection)) {
        return { selected: false, fallback: "", pos: null };
      }

      if (selection.node.type.name === "variable") {
        return {
          selected: true,
          fallback: selection.node.attrs.fallback || "",
          pos: selection.from,
        };
      }

      return { selected: false, fallback: "", pos: null };
    },
    []
  );

  function onFallbackChange(value: string) {
    setFallbackValue(value);

    if (!editor || selectedNodePos === null) return;

    const node = editor.state.doc.nodeAt(selectedNodePos);
    if (!node || node.type.name !== "variable") return;

    const tr = editor.state.tr.setNodeMarkup(selectedNodePos, undefined, {
      ...node.attrs,
      fallback: value || null,
    });

    // Re-select the node after updating to maintain focus
    tr.setSelection(NodeSelection.create(tr.doc, selectedNodePos));

    editor.view.dispatch(tr);
  }

  function onDelete() {
    if (!editor || selectedNodePos === null) return;

    // Re-select the node before deleting to ensure correct target
    const tr = editor.state.tr.setSelection(
      NodeSelection.create(editor.state.doc, selectedNodePos)
    );
    editor.view.dispatch(tr);

    editor.chain().focus().deleteSelection().run();
  }

  // Only show popup on click, not on keyboard navigation
  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;

    function onClick(event: MouseEvent) {
      if (isInputFocusedRef.current) return;

      const target = event.target as HTMLElement;
      const variableNode = target.closest('.variable-node');

      if (variableNode) {
        // Delay to let the selection update first
        setTimeout(() => {
          const { selected, fallback, pos } = isVariableNodeSelected(editor);
          if (selected) {
            setShouldShow(true);
            setFallbackValue(fallback);
            setSelectedNodePos(pos);
          }
        }, 0);
      } else {
        setShouldShow(false);
      }
    }

    function onSelectionUpdate() {
      if (isInputFocusedRef.current) return;

      const { selected } = isVariableNodeSelected(editor);
      if (!selected) {
        setShouldShow(false);
      }
    }

    editorDom.addEventListener("click", onClick);
    editor.on("selectionUpdate", onSelectionUpdate);

    return () => {
      editorDom.removeEventListener("click", onClick);
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, isVariableNodeSelected]);

  function onInputFocus() {
    isInputFocusedRef.current = true;
  }

  function onInputBlur() {
    isInputFocusedRef.current = false;
    if (editor) {
      const { selected } = isVariableNodeSelected(editor);
      if (!selected) {
        setShouldShow(false);
      }
    }
  }

  if (!editor) return null;

  return (
    <FloatingElement
      zIndex={60}
      editor={editor}
      shouldShow={shouldShow}
      getBoundingClientRect={getVariableNodeBoundingRect}
      className="variable-fallback-floating"
      floatingOptions={{
        placement: "bottom-start",
        whileElementsMounted: (referenceEl, floatingEl, update) => {
          const cleanup = autoUpdate(referenceEl, floatingEl, update, {
            ancestorScroll: true,
            ancestorResize: true,
            elementResize: true,
            layoutShift: true,
            animationFrame: true,
          });

          if (editor) {
            const onEditorUpdate = () => update();

            editor.on("selectionUpdate", onEditorUpdate);
            editor.on("transaction", onEditorUpdate);

            return () => {
              cleanup();
              editor.off("selectionUpdate", onEditorUpdate);
              editor.off("transaction", onEditorUpdate);
            };
          }

          return cleanup;
        },
      }}
    >
      <Card>
        <CardBody>
          <CardItemGroup orientation="horizontal">
            <InputGroup>
              <Input
                ref={inputRef}
                type="text"
                placeholder="Fallback value..."
                value={fallbackValue}
                onChange={(event) => onFallbackChange(event.target.value)}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Escape" || event.key === "Enter") {
                    isInputFocusedRef.current = false;
                    editor.commands.focus();
                  }
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                autoFocus
              />
            </InputGroup>

            <ButtonGroup orientation="horizontal">
              <Button
                type="button"
                data-style="ghost"
                title="Apply"
                onClick={() => {
                  isInputFocusedRef.current = false;
                  editor.commands.focus();
                }}
              >
                <CornerDownLeftIcon className="tiptap-button-icon" />
              </Button>
            </ButtonGroup>

            <Separator />

            <ButtonGroup orientation="horizontal">
              <Button
                type="button"
                data-style="ghost"
                title="Delete variable"
                onClick={onDelete}
              >
                <TrashIcon className="tiptap-button-icon" />
              </Button>
            </ButtonGroup>
          </CardItemGroup>
        </CardBody>
      </Card>
    </FloatingElement>
  );
}
