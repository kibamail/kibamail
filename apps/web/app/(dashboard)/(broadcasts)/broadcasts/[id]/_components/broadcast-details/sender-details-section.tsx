"use client";

import { useCallback, useMemo } from "react";
import { SenderSelect } from "@/components/sender-select";
import { ReplyToSelect } from "@/components/reply-to-select";
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
  replyToIdentityId?: string;
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];
  onChange: (updates: Partial<BroadcastDetails>) => void;
  senderState: SenderSelectState;
  senderActions: SenderSelectActions;
  readonly?: boolean;
}

export function SenderDetailsSection({
  senderIdentityId,
  replyToIdentityId,
  senderIdentities,
  domains,
  onChange,
  senderState,
  senderActions,
  readonly = false,
}: SenderDetailsSectionProps) {
  const onSenderChange = useCallback(
    (id: string | undefined) => {
      onChange({ senderIdentityId: id });
    },
    [onChange]
  );

  const onReplyToChange = useCallback(
    (id: string | undefined) => {
      onChange({ replyToIdentityId: id });
    },
    [onChange]
  );

  const selectedSender = useMemo(() => {
    return senderIdentities.find((s) => s.id === senderIdentityId);
  }, [senderIdentities, senderIdentityId]);

  const replyToIdentities = useMemo(() => {
    if (!selectedSender) return [];
    return senderIdentities.filter((s) => s.domainId === selectedSender.domainId);
  }, [senderIdentities, selectedSender]);

  return (
    <section>
      <SectionHeader
        title="Sender details"
        description="Choose who this email will be sent from. Recipients will see this in their inbox."
      />

      <div className="flex flex-col gap-4">
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
          disabled={readonly}
        />

        <ReplyToSelect
          senderIdentities={replyToIdentities}
          value={replyToIdentityId}
          onChange={onReplyToChange}
          disabled={readonly || !selectedSender}
        />
      </div>
    </section>
  );
}
