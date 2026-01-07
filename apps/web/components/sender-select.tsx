"use client";

import * as Alert from "@kibamail/owly/alert";
import * as Select from "@kibamail/owly/select-field";
import { Text } from "@kibamail/owly/text";
import type { SendingDomain } from "@prisma/client";
import { WarningTriangle } from "iconoir-react";
import { useState } from "react";
import { CreateDomainModal, type CreatedDomain } from "./create-domain-modal";
import {
  CreateSenderIdentityModal,
  type VerifiedDomain,
} from "./create-sender-identity-modal";

export type { CreatedDomain };

export interface TransformedSenderIdentity {
  id: string;
  name: string;
  email: string;
  localPart: string;
  domain: string;
  domainId: string;
  replyToEmail?: string | null;
  verified: boolean;
  createdAt?: string;
}

interface SenderSelectProps {
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];
  value?: string;
  onChange: (senderIdentityId: string | undefined) => void;
  onSenderIdentityCreated?: (identity: TransformedSenderIdentity) => void;
  onDomainCreated?: (domain: CreatedDomain) => void;
  label?: string;
  labelHelp?: string;
  disabled?: boolean;
  // Legacy props - kept for backwards compatibility but no longer used for inline creation
  localPart?: string;
  onLocalPartChange?: (value: string) => void;
  domainId?: string;
  onDomainIdChange?: (id: string) => void;
  isAddingNew?: boolean;
  onIsAddingNewChange?: (value: boolean) => void;
}

export function SenderSelect({
  senderIdentities,
  domains,
  value,
  onChange,
  onSenderIdentityCreated,
  onDomainCreated,
  label = "From",
  labelHelp,
  disabled = false,
}: SenderSelectProps) {
  const [createDomainModalOpen, setCreateDomainModalOpen] = useState(false);
  const [createSenderModalOpen, setCreateSenderModalOpen] = useState(false);

  const hasSenderIdentities = senderIdentities.length > 0;
  const hasDomains = domains.length > 0;

  // Filter to only verified domains (domains with name means they're visible/usable)
  const verifiedDomains: VerifiedDomain[] = domains.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  function onSenderSelect(selectedValue: string) {
    if (selectedValue === "__add_new__") {
      setCreateSenderModalOpen(true);
    } else {
      onChange(selectedValue);
    }
  }

  function onDomainCreatedInternal(domain: CreatedDomain) {
    onDomainCreated?.(domain);
  }

  function onSenderCreated(identity: TransformedSenderIdentity) {
    // Select the newly created sender identity
    onChange(identity.id);
    onSenderIdentityCreated?.(identity);
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

  return (
    <>
      <Select.Root
        value={value}
        onValueChange={onSenderSelect}
        disabled={disabled}
      >
        <Select.Label help={labelHelp}>{label}</Select.Label>
        <Select.Trigger placeholder="Select sender" />
        <Select.Content className="z-50">
          {hasSenderIdentities ? (
            senderIdentities.map((identity) => (
              <Select.Item key={identity.id} value={identity.id}>
                <div className="flex flex-col">
                  <span>{identity.name}</span>
                  <span className="text-xs text-kb-content-tertiary">
                    {identity.email}
                  </span>
                </div>
              </Select.Item>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-kb-content-tertiary">
              No sender identities yet
            </div>
          )}
          <Select.Separator />
          <Select.Item value="__add_new__">
            <span className="text-kb-content-secondary">+ Add new sender</span>
          </Select.Item>
        </Select.Content>
      </Select.Root>
      <CreateSenderIdentityModal
        open={createSenderModalOpen}
        onOpenChange={setCreateSenderModalOpen}
        domains={verifiedDomains}
        onSuccess={onSenderCreated}
      />
    </>
  );
}

export function getEmailFromSenderSelect({
  senderIdentities,
  senderIdentityId,
}: {
  senderIdentities: TransformedSenderIdentity[];
  domains?: Pick<SendingDomain, "id" | "name">[];
  senderIdentityId?: string;
  localPart?: string;
  domainId?: string;
  isAddingNew?: boolean;
}): string | undefined {
  if (senderIdentityId) {
    const selectedIdentity = senderIdentities.find(
      (si) => si.id === senderIdentityId,
    );
    return selectedIdentity?.email;
  }

  return undefined;
}
