"use client";

import { useState, useId } from "react";
import * as Popover from "@kibamail/owly/popover";
import * as Select from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import * as Alert from "@kibamail/owly/alert";
import { Text } from "@kibamail/owly/text";
import { WarningTriangle } from "iconoir-react";
import type { SendingDomain } from "@prisma/client";
import { CreateDomainModal, type CreatedDomain } from "./create-domain-modal";

export type { CreatedDomain };

export interface TransformedSenderIdentity {
  id: string;
  name: string;
  email: string;
  localPart: string;
  domain: string;
  domainId: string;
  verified: boolean;
}

interface SenderSelectProps {
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];
  value?: string;
  onChange: (senderIdentityId: string | undefined) => void;
  localPart?: string;
  onLocalPartChange?: (value: string) => void;
  domainId?: string;
  onDomainIdChange?: (id: string) => void;
  isAddingNew?: boolean;
  onIsAddingNewChange?: (value: boolean) => void;
  onDomainCreated?: (domain: CreatedDomain) => void;
  label?: string;
  labelHelp?: string;
  disabled?: boolean;
}

export function SenderSelect({
  senderIdentities,
  domains,
  value,
  onChange,
  localPart: controlledLocalPart,
  onLocalPartChange,
  domainId: controlledDomainId,
  onDomainIdChange,
  isAddingNew: controlledIsAddingNew,
  onIsAddingNewChange,
  onDomainCreated,
  label = "From",
  labelHelp,
  disabled = false,
}: SenderSelectProps) {
  const [internalIsAddingNew, setInternalIsAddingNew] = useState(false);
  const [internalLocalPart, setInternalLocalPart] = useState("");
  const [internalDomainId, setInternalDomainId] = useState(domains[0]?.id || "");
  const [domainPopoverOpen, setDomainPopoverOpen] = useState(false);
  const [createDomainModalOpen, setCreateDomainModalOpen] = useState(false);
  const localPartFieldId = useId();

  const isAddingNew = controlledIsAddingNew ?? internalIsAddingNew;
  const localPart = controlledLocalPart ?? internalLocalPart;
  const domainId = controlledDomainId ?? internalDomainId;

  const hasSenderIdentities = senderIdentities.length > 0;
  const hasDomains = domains.length > 0;

  function setIsAddingNew(val: boolean) {
    if (onIsAddingNewChange) {
      onIsAddingNewChange(val);
    } else {
      setInternalIsAddingNew(val);
    }
  }

  function setLocalPart(val: string) {
    if (onLocalPartChange) {
      onLocalPartChange(val);
    } else {
      setInternalLocalPart(val);
    }
  }

  function setDomainId(val: string) {
    if (onDomainIdChange) {
      onDomainIdChange(val);
    } else {
      setInternalDomainId(val);
    }
  }

  function onSenderSelect(selectedValue: string) {
    if (selectedValue === "__add_new__") {
      setIsAddingNew(true);
      onChange(undefined);
    } else {
      setIsAddingNew(false);
      onChange(selectedValue);
    }
  }

  function onDomainCreatedInternal(domain: CreatedDomain) {
    setDomainId(domain.id);
    onDomainCreated?.(domain);
  }

  if (!hasDomains) {
    return (
      <>
        <Alert.Root variant="warning">
          <Alert.Icon>
            <WarningTriangle className="w-5 h-5" />
          </Alert.Icon>
          <div className="flex flex-col gap-1">
            <Alert.Title>No sending domains configured</Alert.Title>
            <Text size="sm" className="text-kb-content-secondary">
              You need to add a sending domain before you can send broadcasts.{" "}
              <button
                type="button"
                onClick={() => setCreateDomainModalOpen(true)}
                className="text-kb-content-primary underline cursor-pointer"
              >
                Add a domain
              </button>
            </Text>
          </div>
        </Alert.Root>
        <CreateDomainModal
          open={createDomainModalOpen}
          onOpenChange={setCreateDomainModalOpen}
          onSuccess={onDomainCreatedInternal}
        />
      </>
    );
  }

  if (hasSenderIdentities && !isAddingNew) {
    return (
      <Select.Root value={value} onValueChange={onSenderSelect} disabled={disabled}>
        <Select.Label help={labelHelp}>{label}</Select.Label>
        <Select.Trigger placeholder="Select sender" />
        <Select.Content className="z-50">
          {senderIdentities.map((identity) => (
            <Select.Item key={identity.id} value={identity.id}>
              <span>{identity.email}</span>
            </Select.Item>
          ))}
          <Select.Item value="__add_new__">
            <span className="text-kb-content-secondary">+ Add new sender</span>
          </Select.Item>
        </Select.Content>
      </Select.Root>
    );
  }

  return (
    <TextField.Root
      id={localPartFieldId}
      value={localPart}
      onChange={(event) => setLocalPart(event.target.value)}
      placeholder="newsletter"
      disabled={disabled}
    >
      <TextField.Label>{label === "From" ? "From email" : label}</TextField.Label>
      <TextField.Slot side="right">
        <Popover.Root open={domainPopoverOpen} onOpenChange={setDomainPopoverOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="text-kb-content-secondary hover:text-kb-content-primary cursor-pointer text-sm"
            >
              @{domains.find((d) => d.id === domainId)?.name || "Select domain"}
            </button>
          </Popover.Trigger>
          <Popover.Content
            align="end"
            className="w-48 -ml-2 bg-kb-surface-primary border border-kb-stroke-secondary rounded-lg shadow-lg p-1"
          >
            {domains.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => {
                  setDomainId(domain.id);
                  setDomainPopoverOpen(false);
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-kb-content-primary hover:bg-kb-surface-secondary rounded cursor-pointer"
              >
                {domain.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setDomainPopoverOpen(false);
                setCreateDomainModalOpen(true);
              }}
              className="flex items-center w-full px-3 py-2 text-sm text-kb-content-secondary hover:bg-kb-surface-secondary rounded cursor-pointer"
            >
              + Add new domain
            </button>
          </Popover.Content>
        </Popover.Root>
      </TextField.Slot>
      <CreateDomainModal
        open={createDomainModalOpen}
        onOpenChange={setCreateDomainModalOpen}
        onSuccess={onDomainCreatedInternal}
      />
    </TextField.Root>
  );
}

export function getEmailFromSenderSelect({
  senderIdentities,
  domains,
  senderIdentityId,
  localPart,
  domainId,
  isAddingNew,
}: {
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];
  senderIdentityId?: string;
  localPart?: string;
  domainId?: string;
  isAddingNew: boolean;
}): string | undefined {
  if (isAddingNew || senderIdentities.length === 0) {
    if (domains.length > 0 && localPart && domainId) {
      const selectedDomain = domains.find((d) => d.id === domainId);
      if (selectedDomain && localPart.trim()) {
        return `${localPart.trim()}@${selectedDomain.name}`;
      }
    }
    return undefined;
  }

  if (senderIdentityId) {
    const selectedIdentity = senderIdentities.find((si) => si.id === senderIdentityId);
    return selectedIdentity?.email;
  }

  return undefined;
}
