"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextareaField from "@kibamail/owly/textarea-field";
import { useToast } from "@kibamail/owly/toast";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { internalApi } from "@/lib/api/client";

interface SendTestEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broadcastId: string;
  onSaveDraft: () => Promise<void>;
}

const MAX_TEST_EMAILS = 10;

function parseEmails(input: string): string[] {
  return input
    .split(/[,\n]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

function validateEmails(emails: string[]): { valid: boolean; error?: string } {
  if (emails.length === 0) {
    return { valid: false, error: "Please enter at least one email address" };
  }

  if (emails.length > MAX_TEST_EMAILS) {
    return {
      valid: false,
      error: `Maximum ${MAX_TEST_EMAILS} test emails allowed`,
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter((email) => !emailRegex.test(email));

  if (invalidEmails.length > 0) {
    return {
      valid: false,
      error: `Invalid email${invalidEmails.length > 1 ? "s" : ""}: ${invalidEmails.join(", ")}`,
    };
  }

  return { valid: true };
}

export function SendTestEmailModal({
  open,
  onOpenChange,
  broadcastId,
  onSaveDraft,
}: SendTestEmailModalProps) {
  const [emailsInput, setEmailsInput] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const { success: toast, error: toastError } = useToast();

  const sendTestMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      // Save draft first to ensure latest content is sent
      await onSaveDraft();
      return internalApi.broadcasts().sendTest(broadcastId, emails);
    },
    onSuccess: (data) => {
      toast(data.message);
      onClose();
    },
    onError: (error) => {
      toastError(
        error instanceof Error ? error.message : "Failed to send test email",
      );
    },
  });

  function onClose() {
    setEmailsInput("");
    setValidationError(undefined);
    onOpenChange(false);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const emails = parseEmails(emailsInput);
    const validation = validateEmails(emails);

    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    setValidationError(undefined);
    sendTestMutation.mutate(emails);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <form onSubmit={onSubmit}>
          <Dialog.Header>
            <Dialog.Title>Send Test Email</Dialog.Title>
            <Dialog.Description>
              Send a test version of this broadcast to verify how it looks
              before sending to your audience.
            </Dialog.Description>
          </Dialog.Header>

          <div className="py-4 px-6">
            <TextareaField.Root
              placeholder="email@example.com, another@example.com"
              value={emailsInput}
              onChange={(event) => {
                setEmailsInput(event.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              rows={4}
            >
              <TextareaField.Label>Email addresses</TextareaField.Label>
              <TextareaField.Hint>
                Enter up to {MAX_TEST_EMAILS} email addresses, separated by
                commas or new lines
              </TextareaField.Hint>
              {validationError && (
                <TextareaField.Error>{validationError}</TextareaField.Error>
              )}
            </TextareaField.Root>
          </div>

          <Dialog.Footer className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={sendTestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendTestMutation.isPending || !emailsInput.trim()}
              loading={sendTestMutation.isPending}
            >
              Send test
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
