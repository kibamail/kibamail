"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import {
  type BroadcastDetails,
  type Domain,
  type TransformedSenderIdentity,
  type SenderSelectState,
  type SenderSelectActions,
  SectionDivider,
  EmailSubjectSection,
  SenderDetailsSection,
  RecipientsSection,
  SendTimeSection,
} from "./broadcast-details";

// Initialize dayjs plugins
dayjs.extend(relativeTime);

// Re-export types for external use
export type { BroadcastDetails } from "./broadcast-details";

interface BroadcastDetailsTabProps {
  broadcast: BroadcastDetails;
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];
  onChange: (updates: Partial<BroadcastDetails>) => void;
  onSave: () => void;
  isSaving: boolean;
  senderState: SenderSelectState;
  senderActions: SenderSelectActions;
}

export function BroadcastDetailsTab({
  broadcast,
  senderIdentities,
  domains,
  onChange,
  onSave,
  isSaving,
  senderState,
  senderActions,
}: BroadcastDetailsTabProps) {
  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        <EmailSubjectSection
          subject={broadcast.subject}
          previewText={broadcast.previewText}
          onChange={onChange}
        />

        <SectionDivider />

        <SenderDetailsSection
          senderIdentityId={broadcast.senderIdentityId}
          senderIdentities={senderIdentities}
          domains={domains}
          onChange={onChange}
          senderState={senderState}
          senderActions={senderActions}
        />

        <SectionDivider />

        <RecipientsSection
          topicId={broadcast.topicId}
          segmentId={broadcast.segmentId}
          onChange={onChange}
        />

        <SectionDivider />

        <SendTimeSection
          sendAt={broadcast.sendAt}
          onChange={onChange}
          onSave={onSave}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
