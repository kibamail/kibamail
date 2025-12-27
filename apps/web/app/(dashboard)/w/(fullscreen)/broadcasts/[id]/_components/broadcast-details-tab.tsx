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
  TrackingSection,
} from "./broadcast-details";

dayjs.extend(relativeTime);

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
  readonly?: boolean;
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
  readonly = false,
}: BroadcastDetailsTabProps) {
  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        <EmailSubjectSection
          subject={broadcast.subject}
          previewText={broadcast.previewText}
          onChange={onChange}
          readonly={readonly}
        />

        <SectionDivider />

        <SenderDetailsSection
          senderIdentityId={broadcast.senderIdentityId}
          replyToIdentityId={broadcast.replyToIdentityId}
          senderIdentities={senderIdentities}
          domains={domains}
          onChange={onChange}
          senderState={senderState}
          senderActions={senderActions}
          readonly={readonly}
        />

        <SectionDivider />

        <RecipientsSection
          topicId={broadcast.topicId}
          segmentId={broadcast.segmentId}
          onChange={onChange}
          readonly={readonly}
        />

        <SectionDivider />

        <TrackingSection
          trackClicks={broadcast.trackClicks}
          trackOpens={broadcast.trackOpens}
          onChange={onChange}
          readonly={readonly}
        />

        <SectionDivider />

        <SendTimeSection
          sendAt={broadcast.sendAt}
          onChange={onChange}
          onSave={onSave}
          isSaving={isSaving}
          readonly={readonly}
        />
      </div>
    </div>
  );
}
