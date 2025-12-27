"use client";

import { Alert } from "@kibamail/owly";
import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { Check, Copy, InfoCircle } from "iconoir-react";
import { useState } from "react";
import type { ToggleState } from "@/hooks/utils/useToggleState";

interface ApiKeyCreatedModalProps extends ToggleState {
  apiKey: string;
}

export function ApiKeyCreatedModal({
  open,
  onOpenChange,
  apiKey,
}: ApiKeyCreatedModalProps) {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!apiKey) return;

    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function onClose() {
    setCopied(false);
    onOpenChange?.(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="space-y-4">
          <Dialog.Header>
            <Dialog.Title>Copy your api key</Dialog.Title>
            <Dialog.Description>
              Your api key was created successfully.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-4 px-6">
            <Alert.Root variant="info">
              <Alert.Icon>
                <InfoCircle />
              </Alert.Icon>
              <Alert.Title>
                You will only be able to see this key once. Please store it
                securely.
              </Alert.Title>
            </Alert.Root>
            <TextField.Root readOnly value={apiKey} className="cursor-pointer!">
              <TextField.Slot side="right" className="cursor-pointer">
                <button type="button" onClick={onCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy />}
                </button>
              </TextField.Slot>
            </TextField.Root>
          </div>

          <Dialog.Footer className="flex justify-end">
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </Dialog.Footer>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
