"use client";

import { useCallback } from "react";
import { SenderSelect } from "@/components/sender-select";
import { SectionHeader } from "./shared";
import type {
  BroadcastDetails,
  Domain,
  TransformedSenderIdentity,
  SenderSelectState,
  SenderSelectActions,
} from "./types";

interface SenderDetailsSectionProps {
  senderIdentityId?: string;
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];
  onChange: (updates: Partial<BroadcastDetails>) => void;
  senderState: SenderSelectState;
  senderActions: SenderSelectActions;
}

export function SenderDetailsSection({
  senderIdentityId,
  senderIdentities,
  domains,
  onChange,
  senderState,
  senderActions,
}: SenderDetailsSectionProps) {
  const onSenderChange = useCallback(
    (id: string | undefined) => {
      onChange({ senderIdentityId: id });
    },
    [onChange]
  );

  return (
    <section>
      <SectionHeader
        title="Sender details"
        description="Choose who this email will be sent from. Recipients will see this in their inbox."
      />

      <SenderSelect
        senderIdentities={senderIdentities}
        domains={domains}
        value={senderIdentityId}
        onChange={onSenderChange}
        onDomainCreated={senderActions.onDomainCreated}
        localPart={senderState.localPart}
        onLocalPartChange={senderActions.onLocalPartChange}
        domainId={senderState.domainId}
        onDomainIdChange={senderActions.onDomainIdChange}
        isAddingNew={senderState.isAddingNew}
        onIsAddingNewChange={senderActions.onIsAddingNewChange}
      />
    </section>
  );
}
