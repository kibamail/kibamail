"use client";

import { useCallback, useMemo } from "react";
import { SectionHeader } from "@/components/email-editor/details-sections/shared";
import type {
  Domain,
  EmailDetails,
  TransformedSenderIdentity,
} from "@/components/email-editor/types";
import { ReplyToSelect } from "@/components/reply-to-select";
import { SenderSelect, type CreatedDomain } from "@/components/sender-select";

interface SenderDetailsSectionProps {
  senderIdentityId?: string;
  replyToIdentityId?: string;
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];
  onChange: (updates: Partial<EmailDetails>) => void;
  onSenderIdentityCreated?: (identity: TransformedSenderIdentity) => void;
  onDomainCreated?: (domain: CreatedDomain) => void;
  readonly?: boolean;
}

export function SenderDetailsSection({
  senderIdentityId,
  replyToIdentityId,
  senderIdentities,
  domains,
  onChange,
  onSenderIdentityCreated,
  onDomainCreated,
  readonly = false,
}: SenderDetailsSectionProps) {
  const onSenderChange = useCallback(
    (id: string | undefined) => {
      onChange({ senderIdentityId: id });
    },
    [onChange],
  );

  const onReplyToChange = useCallback(
    (id: string | undefined) => {
      onChange({ replyToIdentityId: id });
    },
    [onChange],
  );

  const selectedSender = useMemo(() => {
    return senderIdentities.find((s) => s.id === senderIdentityId);
  }, [senderIdentities, senderIdentityId]);

  const replyToIdentities = useMemo(() => {
    if (!selectedSender) return [];
    return senderIdentities.filter(
      (s) => s.domainId === selectedSender.domainId,
    );
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
          onSenderIdentityCreated={onSenderIdentityCreated}
          onDomainCreated={onDomainCreated}
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
