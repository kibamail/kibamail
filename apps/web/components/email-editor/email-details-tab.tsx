"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { CreatedDomain } from "@/components/sender-select";
import {
  EmailSubjectSection,
  RecipientsSection,
  SectionDivider,
  SenderDetailsSection,
  SendTimeSection,
  TrackingSection,
} from "./details-sections";
import type {
  BroadcastDetails,
  Domain,
  EditorDetails,
  EmailDetails,
  EmailEditorMode,
  TransformedSenderIdentity,
} from "./types";

dayjs.extend(relativeTime);

interface EmailDetailsTabProps<T extends EmailEditorMode> {
  mode: T;
  details: EditorDetails<T>;
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];
  onChange: (updates: Partial<EditorDetails<T>>) => void;
  onSave: () => void;
  isSaving: boolean;
  onSenderIdentityCreated?: (identity: TransformedSenderIdentity) => void;
  onDomainCreated?: (domain: CreatedDomain) => void;
  readonly?: boolean;
}

export function EmailDetailsTab<T extends EmailEditorMode>({
  mode,
  details,
  senderIdentities,
  domains,
  onChange,
  onSave,
  isSaving,
  onSenderIdentityCreated,
  onDomainCreated,
  readonly = false,
}: EmailDetailsTabProps<T>) {
  // Type assertion for broadcast-specific details
  const broadcastDetails = details as BroadcastDetails;

  const onBaseChange = onChange as (updates: Partial<EmailDetails>) => void;
  const onBroadcastChange = onChange as (
    updates: Partial<BroadcastDetails>,
  ) => void;

  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        {/* Email Subject - Common to all modes */}
        <EmailSubjectSection
          subject={details.subject}
          previewText={details.previewText}
          onChange={onBaseChange}
          readonly={readonly}
        />

        <SectionDivider />

        {/* Sender Details - Common to all modes */}
        <SenderDetailsSection
          senderIdentityId={details.senderIdentityId}
          replyToIdentityId={details.replyToIdentityId}
          senderIdentities={senderIdentities}
          domains={domains}
          onChange={onBaseChange}
          onSenderIdentityCreated={onSenderIdentityCreated}
          onDomainCreated={onDomainCreated}
          readonly={readonly}
        />

        {/* Recipients - Broadcast only */}
        {mode === "broadcast" && (
          <>
            <SectionDivider />
            <RecipientsSection
              topicId={broadcastDetails.topicId}
              segmentId={broadcastDetails.segmentId}
              onChange={onBroadcastChange}
              readonly={readonly}
            />
          </>
        )}

        <SectionDivider />

        {/* Tracking - Common to all modes */}
        <TrackingSection
          trackClicks={details.trackClicks}
          trackOpens={details.trackOpens}
          onChange={onBaseChange}
          readonly={readonly}
        />

        {/* Send Time - Broadcast only */}
        {mode === "broadcast" && (
          <>
            <SectionDivider />
            <SendTimeSection
              sendAt={broadcastDetails.sendAt}
              onChange={onBroadcastChange}
              onSave={onSave}
              isSaving={isSaving}
              readonly={readonly}
            />
          </>
        )}

        {/* For non-broadcast modes, show save button at the end */}
        {mode !== "broadcast" && !readonly && (
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-2 bg-kb-primary text-white rounded-lg disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
