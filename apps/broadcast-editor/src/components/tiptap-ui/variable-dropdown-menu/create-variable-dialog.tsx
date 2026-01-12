import { useEffect, useState } from "react";
import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import * as SelectField from "@kibamail/owly/select-field";
import { ConfirmDialog } from "@kibamail/owly/dialog";

import "./create-variable-dialog.scss";

import type { VariableType, NormalizedVariable } from "@/contexts/variables-context";

export interface VariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Variable to edit. If undefined, dialog is in create mode */
  variable?: NormalizedVariable;
  onSubmit: (variable: { name: string; type: VariableType }) => void;
  onDelete?: (id: string) => void;
}

export function VariableDialog({
  open,
  onOpenChange,
  variable,
  onSubmit,
  onDelete,
}: VariableDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<VariableType>("text");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!variable;

  // Populate form when editing
  useEffect(() => {
    if (variable) {
      setName(variable.name);
      setType(variable.type);
    } else {
      setName("");
      setType("text");
    }
  }, [variable, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        type,
      });
      resetForm();
      onOpenChange(false);
    }
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  function resetForm() {
    setName("");
    setType("text");
    setShowDeleteConfirm(false);
  }

  function handleDeleteClick() {
    // Close the edit dialog first, then show delete confirmation
    onOpenChange(false);
    // Small delay to allow the edit dialog to close before showing confirm
    setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 100);
  }

  function handleDeleteConfirm() {
    if (variable && onDelete) {
      onDelete(variable.id);
      setShowDeleteConfirm(false);
      resetForm();
    }
  }

  function handleDeleteCancel(open: boolean) {
    setShowDeleteConfirm(open);
    // If closing the delete confirm dialog (cancel), reopen the edit dialog
    if (!open) {
      setTimeout(() => {
        onOpenChange(true);
      }, 100);
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleClose}>
        <Dialog.Content className="create-variable-dialog">
          <form onSubmit={handleSubmit}>
            <Dialog.Header>
              <Dialog.Title>
                {isEditMode ? "Edit Variable" : "Create Variable"}
              </Dialog.Title>
              <Dialog.Description>
                {isEditMode
                  ? "Update this variable's name and type."
                  : "Create a new variable to use in your email content."}
              </Dialog.Description>
            </Dialog.Header>

            <div className="create-variable-dialog-body">
              <TextField.Root
                id="variable-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="variable_name"
                autoFocus
              >
                <TextField.Label>Variable Name</TextField.Label>
                <TextField.Hint>
                  Use snake_case for consistency (e.g., first_name, company_url)
                </TextField.Hint>
              </TextField.Root>

              <SelectField.Root
                value={type}
                onValueChange={(value) => setType(value as VariableType)}
              >
                <SelectField.Label>Variable Type</SelectField.Label>
                <SelectField.Trigger placeholder="Select type" />
                <SelectField.Content className="create-variable-dialog-select-content">
                  <SelectField.Item value="text">Text</SelectField.Item>
                  <SelectField.Item value="number">Number</SelectField.Item>
                </SelectField.Content>
              </SelectField.Root>
            </div>

            <Dialog.Footer className="create-variable-dialog-footer">
              {isEditMode && onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteClick}
                >
                  Delete
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
              )}
              <div className="create-variable-dialog-footer-actions">
                {isEditMode && (
                  <Button type="button" variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={!name.trim()}>
                  {isEditMode ? "Save Changes" : "Create Variable"}
                </Button>
              </div>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={handleDeleteCancel}
        title="Delete Variable"
        description={`Are you sure you want to delete "${variable?.name}"? This will remove all instances of this variable from your email. This action cannot be undone.`}
        confirmText={variable?.name}
        confirm={{
          children: "Delete",
          variant: "destructive",
          onClick: handleDeleteConfirm,
        }}
        cancel={{
          children: "Cancel",
        }}
      />
    </>
  );
}
