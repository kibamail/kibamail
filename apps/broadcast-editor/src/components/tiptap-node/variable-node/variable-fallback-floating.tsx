"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { autoUpdate } from "@floating-ui/react";
import { Trash as TrashIcon, CornerBottomLeft as CornerDownLeftIcon, EditPencil } from "iconoir-react";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { isNodeSelectionType } from "@/lib/tiptap-utils";
import { FloatingElement } from "@/components/tiptap-ui-utils/floating-element";
import { Card, CardBody, CardItemGroup } from "@/components/tiptap-ui-primitive/card";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Input, InputGroup } from "@/components/tiptap-ui-primitive/input";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import { useVariables, type NormalizedVariable } from "@/contexts/variables-context";
import { VariableDialog } from "@/components/tiptap-ui/variable-dropdown-menu/create-variable-dialog";

export interface VariableFallbackFloatingProps {
  editor?: Editor | null;
}

export function VariableFallbackFloating({
  editor: providedEditor,
}: VariableFallbackFloatingProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const { variables, allowCustomVariables, updateVariable, deleteVariable } = useVariables();
  const [shouldShow, setShouldShow] = useState(false);
  const [fallbackValue, setFallbackValue] = useState("");
  const [selectedNodePos, setSelectedNodePos] = useState<number | null>(null);
  const [selectedVariableName, setSelectedVariableName] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<NormalizedVariable | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const isInputFocusedRef = useRef(false);

  // Find the variable object for the currently selected variable
  const selectedVariable = selectedVariableName
    ? variables.find((v) => v.name === selectedVariableName)
    : undefined;

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
    (editorInstance: Editor | null): { selected: boolean; fallback: string; pos: number | null; name: string | null } => {
      if (!editorInstance) return { selected: false, fallback: "", pos: null, name: null };

      const { selection } = editorInstance.state;

      if (!isNodeSelectionType(selection)) {
        return { selected: false, fallback: "", pos: null, name: null };
      }

      if (selection.node.type.name === "variable") {
        return {
          selected: true,
          fallback: selection.node.attrs.fallback || "",
          pos: selection.from,
          name: selection.node.attrs.name || null,
        };
      }

      return { selected: false, fallback: "", pos: null, name: null };
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

    tr.setSelection(NodeSelection.create(tr.doc, selectedNodePos));

    editor.view.dispatch(tr);
  }

  function onDelete() {
    if (!editor || selectedNodePos === null) return;

    const tr = editor.state.tr.setSelection(
      NodeSelection.create(editor.state.doc, selectedNodePos)
    );
    editor.view.dispatch(tr);

    editor.chain().focus().deleteSelection().run();
  }

  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;

    function onClick(event: MouseEvent) {
      if (isInputFocusedRef.current) return;
      if (!editor?.isEditable) return;

      const target = event.target as HTMLElement;
      const variableNode = target.closest('.variable-node');

      if (variableNode) {
        setTimeout(() => {
          const { selected, fallback, pos, name } = isVariableNodeSelected(editor);
          if (selected) {
            setShouldShow(true);
            setFallbackValue(fallback);
            setSelectedNodePos(pos);
            setSelectedVariableName(name);
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

  function onEditClick() {
    if (!selectedVariable) return;
    setEditingVariable(selectedVariable);
    setShouldShow(false);
    setIsEditDialogOpen(true);
  }

  function onEditDialogSubmit(data: { name: string; type: "text" | "number" }) {
    if (!editingVariable) return;

    const oldName = editingVariable.name;
    const newName = data.name;

    updateVariable(editingVariable.id, newName, data.type);

    // Update all instances in the editor if name changed
    if (editor && oldName !== newName) {
      const { tr } = editor.state;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "variable" && node.attrs.name === oldName) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, name: newName });
        }
      });
      editor.view.dispatch(tr);
    }
  }

  function onEditDialogDelete(id: string) {
    if (!editingVariable) return;

    const variableName = editingVariable.name;

    // Delete from context (this also calls the onVariableDelete callback)
    deleteVariable(id);

    // Remove all instances of this variable from the editor
    if (editor) {
      const { tr } = editor.state;
      const nodesToDelete: number[] = [];

      // Collect positions of all variable nodes with this name (in reverse order)
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "variable" && node.attrs.name === variableName) {
          nodesToDelete.push(pos);
        }
      });

      // Delete nodes in reverse order to avoid position shifting issues
      nodesToDelete.reverse().forEach((pos) => {
        const node = tr.doc.nodeAt(pos);
        if (node) {
          tr.delete(pos, pos + node.nodeSize);
        }
      });

      if (nodesToDelete.length > 0) {
        editor.view.dispatch(tr);
      }
    }
  }

  if (!editor) return null;

  return (
    <>
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
            editor.on("selectionUpdate", update);
            editor.on("transaction", update);

            return () => {
              cleanup();
              editor.off("selectionUpdate", update);
              editor.off("transaction", update);
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
              {allowCustomVariables && selectedVariable?.editable && (
                <Button
                  type="button"
                  data-style="ghost"
                  title="Edit variable"
                  onClick={onEditClick}
                >
                  <EditPencil className="tiptap-button-icon" />
                </Button>
              )}
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

    <VariableDialog
      open={isEditDialogOpen}
      onOpenChange={setIsEditDialogOpen}
      variable={editingVariable}
      onSubmit={onEditDialogSubmit}
      onDelete={onEditDialogDelete}
    />
  </>
  );
}
