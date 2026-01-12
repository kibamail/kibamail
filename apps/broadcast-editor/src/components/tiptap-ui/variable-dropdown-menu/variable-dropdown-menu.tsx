"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor, Range } from "@tiptap/react";
import { Plus, EditPencil } from "iconoir-react";

// --- Lib ---
import { getElementOverflowPosition } from "@/lib/tiptap-collab-utils";

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

// --- Tiptap UI ---
import type {
  SuggestionMenuProps,
  SuggestionMenuRenderProps,
} from "@/components/tiptap-ui-utils/suggestion-menu";
import { SuggestionMenu } from "@/components/tiptap-ui-utils/suggestion-menu";

// --- UI Primitives ---
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card";

// --- Contexts ---
import { useVariables, type NormalizedVariable } from "@/contexts/variables-context";

// --- Components ---
import { VariableDialog } from "./create-variable-dialog";

type VariableDropdownMenuProps = Omit<
  SuggestionMenuProps,
  "items" | "children"
>;

interface VariableItemProps {
  variable: NormalizedVariable;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}

export const VariableDropdownMenu = (props: VariableDropdownMenuProps) => {
  const { editor } = useTiptapEditor();
  const { variables, allowCustomVariables, addVariable, updateVariable, deleteVariable } = useVariables();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<NormalizedVariable | undefined>();
  const triggerPositionRef = useRef<number | null>(null);

  // Use a ref to always access the latest variables inside the callback
  // This avoids stale closure issues with the SuggestionMenu's cached items function
  const variablesRef = useRef(variables);
  variablesRef.current = variables;

  const handleItemSelect = useCallback(
    (selectProps: { editor: Editor; range: Range; context?: string }) => {
      if (!selectProps.editor || !selectProps.context) return;

      // The SuggestionMenu's command handler already deleted the trigger text ({{ + query)
      // So we just need to insert the variable node at the current cursor position
      selectProps.editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "variable",
            attrs: {
              name: selectProps.context,
              fallback: null,
            },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run();
    },
    []
  );

  const getSuggestionItems = useCallback(
    async (queryProps: { query: string }) => {
      const { query } = queryProps;
      // Use ref to get the latest variables, avoiding stale closure
      const currentVariables = variablesRef.current;

      // Filter variables based on query
      const filteredVariables = query
        ? currentVariables.filter((variable) =>
            variable.name.toLowerCase().includes(query.toLowerCase())
          )
        : currentVariables;

      return filteredVariables.map((variable) => ({
        title: variable.name,
        context: variable.name,
        onSelect: handleItemSelect,
      }));
    },
    [handleItemSelect]
  );

  const handleOpenCreateDialog = useCallback(() => {
    // Store cursor position before opening dialog so we can delete the {{ trigger
    if (editor) {
      triggerPositionRef.current = editor.state.selection.from;
    }
    setEditingVariable(undefined);
    setIsDialogOpen(true);
  }, [editor]);

  const handleOpenEditDialog = useCallback((variable: NormalizedVariable) => {
    setEditingVariable(variable);
    setIsDialogOpen(true);
  }, []);

  const handleDialogSubmit = useCallback(
    (data: { name: string; type: "text" | "number" }) => {
      if (editingVariable) {
        // Edit mode - update existing variable
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
      } else {
        // Create mode - add new variable
        addVariable(data.name, data.type);

        // Insert the variable at cursor position, deleting the {{ trigger first
        if (editor && triggerPositionRef.current !== null) {
          const triggerLength = 2; // Length of "{{"
          const from = triggerPositionRef.current - triggerLength;
          const to = triggerPositionRef.current;

          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContent([
              {
                type: "variable",
                attrs: {
                  name: data.name,
                  fallback: null,
                },
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();

          triggerPositionRef.current = null;
        }
      }
    },
    [editor, editingVariable, addVariable, updateVariable]
  );

  const handleDialogDelete = useCallback(
    (id: string) => {
      if (!editingVariable) return;

      const variableName = editingVariable.name;

      // Delete from context (this also calls the onVariableDelete callback)
      deleteVariable(id);

      // Remove all instances of this variable from the editor
      if (editor) {
        const { tr } = editor.state;
        const nodesToDelete: number[] = [];

        // Collect positions of all variable nodes with this name
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
    },
    [editor, editingVariable, deleteVariable]
  );

  return (
    <>
      <SuggestionMenu
        char="{{"
        pluginKey="variableDropdownMenu"
        decorationClass="tiptap-variable-decoration"
        selector="tiptap-variable-dropdown-menu"
        items={getSuggestionItems}
        {...props}
      >
        {(renderProps) => (
          <VariableList
            {...renderProps}
            variables={variables}
            allowCustomVariables={allowCustomVariables}
            onOpenCreateDialog={handleOpenCreateDialog}
            onEditVariable={handleOpenEditDialog}
          />
        )}
      </SuggestionMenu>

      <VariableDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        variable={editingVariable}
        onSubmit={handleDialogSubmit}
        onDelete={handleDialogDelete}
      />
    </>
  );
};

const VariableItem = ({ variable, isSelected, onSelect, onEdit }: VariableItemProps) => {
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const menuElement = document.querySelector(
      '[data-selector="tiptap-variable-dropdown-menu"]'
    ) as HTMLElement;
    if (!itemRef.current || !isSelected || !menuElement) return;

    const overflow = getElementOverflowPosition(itemRef.current, menuElement);
    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [isSelected]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  }, [onEdit]);

  return (
    <Button
      ref={itemRef}
      data-style="ghost"
      data-active-state={isSelected ? "on" : "off"}
      onClick={onSelect}
      className="variable-item"
    >
      <span className="tiptap-button-text">{variable.name}</span>
      {variable.editable && onEdit && (
        <button
          type="button"
          className="variable-item-edit"
          onClick={handleEditClick}
          aria-label={`Edit ${variable.name}`}
        >
          <EditPencil />
        </button>
      )}
    </Button>
  );
};

interface VariableListProps extends SuggestionMenuRenderProps<string> {
  variables: NormalizedVariable[];
  allowCustomVariables: boolean;
  onOpenCreateDialog: () => void;
  onEditVariable: (variable: NormalizedVariable) => void;
}

const VariableList = ({
  items,
  selectedIndex,
  onSelect,
  variables,
  allowCustomVariables,
  onOpenCreateDialog,
  onEditVariable,
}: VariableListProps) => {
  // Map suggestion items to their NormalizedVariable counterparts
  const variableMap = useMemo(() => {
    const map = new Map<string, NormalizedVariable>();
    variables.forEach((v) => map.set(v.name, v));
    return map;
  }, [variables]);

  const renderedItems = useMemo(() => {
    return items.map((item, index) => {
      const variable = variableMap.get(item.title);
      if (!variable) return null;

      // Only show edit for editable variables when allowCustomVariables is enabled
      const canEdit = allowCustomVariables && variable.editable;

      return (
        <VariableItem
          key={variable.id}
          variable={variable}
          isSelected={index === selectedIndex}
          onSelect={() => onSelect(item)}
          onEdit={canEdit ? () => onEditVariable(variable) : undefined}
        />
      );
    });
  }, [items, selectedIndex, onSelect, variableMap, allowCustomVariables, onEditVariable]);

  const handleCreateClick = useCallback(() => {
    // Dispatch Escape key to close the dropdown, then open dialog
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    onOpenCreateDialog();
  }, [onOpenCreateDialog]);

  return (
    <Card
      style={{
        maxHeight: "var(--suggestion-menu-max-height)",
      }}
    >
      <CardBody>
        {renderedItems.length > 0 && (
          <ButtonGroup>{renderedItems}</ButtonGroup>
        )}
        {allowCustomVariables && (
          <Button
            data-style="ghost"
            onClick={handleCreateClick}
            style={{ justifyContent: "flex-start", textAlign: "left" }}
          >
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">Create variable</span>
          </Button>
        )}
      </CardBody>
    </Card>
  );
};
