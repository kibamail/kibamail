"use client";

import * as React from "react";
import cn from "classnames";
import * as Dialog from "./dialog.js";
import { Button } from "../button/button.js";
import type { ButtonProps } from "../button/button.props.js";
import { ConfirmDialogIcon } from "./confirm-dialog-icon.js";
import {
  ConfirmDialogCloseIcon,
  ConfirmDialogCopyIcon,
  ConfirmDialogCheckIcon,
} from "./confirm-dialog-icons.js";
import * as TextField from "../text-field/text-field.js";
import { Text } from "../text/text.js";
import { Badge } from "../badge/badge.js";

export interface ConfirmDialogProps {
  /**
   * Whether the dialog is open
   */
  open?: boolean;
  /**
   * Callback when the open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * The title of the confirmation dialog
   */
  title: string;
  /**
   * The description/message of the confirmation dialog
   */
  description?: string;
  /**
   * Props for the confirm button. Use children to change the label.
   * @default { variant: "primary", children: "Confirm" }
   */
  confirm?: ButtonProps;
  /**
   * Props for the cancel button. Use children to change the label.
   * @default { variant: "secondary", children: "Cancel" }
   */
  cancel?: ButtonProps;
  /**
   * If provided, requires the user to type this exact text before the confirm button is enabled.
   * Useful for destructive actions that need extra confirmation.
   */
  confirmText?: string;
}

export const ConfirmDialog: React.FC<
  React.PropsWithChildren<ConfirmDialogProps>
> = (props) => {
  const {
    open,
    onOpenChange,
    title,
    description,
    confirm,
    cancel,
    confirmText,
    children,
  } = props;

  const [inputValue, setInputValue] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setInputValue("");
      setCopied(false);
    }
  }, [open]);

  const {
    children: confirmLabel = "Confirm",
    variant: confirmVariant = "primary",
    onClick: onConfirmClick,
    disabled: confirmDisabled,
    ...confirmButtonProps
  } = confirm || {};

  const {
    children: cancelLabel = "Cancel",
    variant: cancelVariant = "secondary",
    onClick: onCancelClick,
    ...cancelButtonProps
  } = cancel || {};

  const isConfirmDisabled = confirmText
    ? inputValue !== confirmText || confirmDisabled
    : confirmDisabled;

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    onConfirmClick?.(e);
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    onCancelClick?.(e);
    onOpenChange?.(false);
  };

  const handleCopyConfirmText = async () => {
    if (confirmText) {
      try {
        await navigator.clipboard.writeText(confirmText);
        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 3000);
      } catch (err) {}
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <div className="kb-dialog-header">
          <div
            className={cn(
              "kb-confirm-dialog-header",
              `kb-variant-${confirmVariant}`
            )}
          >
            <div className="kb-confirm-dialog-icon-container">
              <ConfirmDialogIcon />
            </div>
            <div className="kb-confirm-dialog-content">
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description>{description}</Dialog.Description>
              )}
            </div>
          </div>
          <Dialog.Close asChild>
            <button
              className="kb-dialog-close kb-reset"
              type="button"
              aria-label="Close"
            >
              <ConfirmDialogCloseIcon />
            </button>
          </Dialog.Close>
        </div>

        {confirmText && (
          <div className="kb-confirm-dialog-body">
            <Text className="kb-confirm-dialog-confirm-text">
              Type
              <Badge size="sm" variant="neutral">
                {confirmText}
                <button
                  type="button"
                  className="kb-confirm-dialog-confirm-text-copy"
                  onClick={handleCopyConfirmText}
                >
                  <ConfirmDialogCopyIcon
                    className={cn(
                      "kb-confirm-dialog-copy-icon",
                      copied && "kb-confirm-dialog-copy-icon-hidden"
                    )}
                  />
                  <ConfirmDialogCheckIcon
                    className={cn(
                      "kb-confirm-dialog-check-icon",
                      copied && "kb-confirm-dialog-check-icon-visible"
                    )}
                  />
                </button>
              </Badge>
              to confirm
            </Text>
            <TextField.Root
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type "${confirmText}" to confirm`}
              autoComplete="off"
            />
          </div>
        )}

        {children}

        <Dialog.Footer>
          <div className="kb-confirm-dialog-actions">
            <Button
              variant={cancelVariant}
              onClick={handleCancel}
              {...cancelButtonProps}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant}
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              {...confirmButtonProps}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};

ConfirmDialog.displayName = "ConfirmDialog";
