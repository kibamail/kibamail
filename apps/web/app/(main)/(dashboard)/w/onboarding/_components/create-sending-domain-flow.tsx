"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as SelectField from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { Text } from "@kibamail/owly/text";
import type React from "react";
import { useState } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ConfigureSendingDomain } from "./configure-sending-domain-modal";

interface CreateSendingDomainFlowProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  product?: "send" | "engage";
  onSuccess?: () => void;
}

export function CreateSendingDomainFlow({
  product = "send",
  children,
  onSuccess,
  onOpenChange,
}: CreateSendingDomainFlowProps) {
  const [open, setOpen] = useState(false);
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdDomainId, setCreatedDomainId] = useState<string | null>(null);

  const tld = "yourdomain.com";

  function onConfigureSendingDomainDialogChanged(newOpen: boolean) {
    setConfigureModalOpen(newOpen);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    onOpenChange?.(newOpen);

    if (!newOpen) {
      setTimeout(() => {
        setDomainName("");
        setIsCreating(false);
      }, 1000);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!domainName) return;

    setIsCreating(true);

    // Simulate API call
    setTimeout(() => {
      setIsCreating(false);
      setOpen(false);
      setCreatedDomainId("mock-domain-id");
      setConfigureModalOpen(true);
      onSuccess?.();
    }, 1500);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Trigger asChild>{children}</Dialog.Trigger>
        <Dialog.Content className="max-w-md">
          <Dialog.Header>
            <Dialog.Title>Add sending domain</Dialog.Title>
            <VisuallyHidden>
              <Dialog.Description>
                Add a new sending domain for your {product} emails
              </Dialog.Description>
            </VisuallyHidden>
          </Dialog.Header>

          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4">
              <div className="mb-6">
                <Text className="text-kb-content-secondary text-sm leading-relaxed">
                  With a verified sending domain, you can send emails that
                  represent your business and follows best email practices. Add
                  your domain and follow the configuration steps to get started
                  sending emails using this domain.
                </Text>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <SelectField.Root
                  name="product"
                  disabled={!!product}
                  defaultValue={product || "send"}
                >
                  <SelectField.Label>Product</SelectField.Label>
                  <SelectField.Trigger />
                  <SelectField.Content className="z-50 relative">
                    <SelectField.Item value="send">
                      Send - transactional emails
                    </SelectField.Item>
                    <SelectField.Item value="engage">
                      Engage - marketing emails
                    </SelectField.Item>
                  </SelectField.Content>
                  <SelectField.Hint>
                    Learn more about transactional vs marketing email domains
                    here.
                  </SelectField.Hint>
                </SelectField.Root>

                <TextField.Root
                  placeholder={`e.g. ${product || "send"}.${tld}`}
                  name="name"
                  required
                  value={domainName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDomainName(e.target.value)
                  }
                >
                  <TextField.Label>Domain name</TextField.Label>
                  <TextField.Hint>
                    You'll need to configure this domain before you can send
                    emails with it.
                  </TextField.Hint>
                </TextField.Root>
              </div>
            </div>

            <Dialog.Footer className="flex justify-between">
              <Dialog.Close asChild disabled={isCreating}>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={isCreating}>
                Add domain
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {createdDomainId && (
        <ConfigureSendingDomain
          open={configureModalOpen}
          domainName={domainName}
          onOpenChange={onConfigureSendingDomainDialogChanged}
        />
      )}
    </>
  );
}
