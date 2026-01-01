"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import {
  SectionDivider,
  EmailSubjectSection,
  SenderDetailsSection,
  TrackingSection,
  RecipientsSection,
  SendTimeSection,
} from "./details-sections";
import type {
  EmailEditorMode,
  EditorDetails,
  EmailDetails,
  Domain,
  TransformedSenderIdentity,
  SenderSelectState,
  SenderSelectActions,
  BroadcastDetails,
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
  senderState: SenderSelectState;
  senderActions: SenderSelectActions;
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
  senderState,
  senderActions,
  readonly = false,
}: EmailDetailsTabProps<T>) {
  // Type assertion for broadcast-specific details
  const broadcastDetails = details as BroadcastDetails;

  // Cast onChange to accept the base EmailDetails type for common sections
  // This is safe because EmailDetails is the base type for all detail types
  const handleChange = onChange as (updates: Partial<EmailDetails>) => void;
  const handleBroadcastChange = onChange as (updates: Partial<BroadcastDetails>) => void;

  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        {/* Email Subject - Common to all modes */}
        <EmailSubjectSection
          subject={details.subject}
          previewText={details.previewText}
          onChange={handleChange}
          readonly={readonly}
        />

        <SectionDivider />

        {/* Sender Details - Common to all modes */}
        <SenderDetailsSection
          senderIdentityId={details.senderIdentityId}
          replyToIdentityId={details.replyToIdentityId}
          senderIdentities={senderIdentities}
          domains={domains}
          onChange={handleChange}
          senderState={senderState}
          senderActions={senderActions}
          readonly={readonly}
        />

        {/* Recipients - Broadcast only */}
        {mode === "broadcast" && (
          <>
            <SectionDivider />
            <RecipientsSection
              topicId={broadcastDetails.topicId}
              segmentId={broadcastDetails.segmentId}
              onChange={handleBroadcastChange}
              readonly={readonly}
            />
          </>
        )}

        <SectionDivider />

        {/* Tracking - Common to all modes */}
        <TrackingSection
          trackClicks={details.trackClicks}
          trackOpens={details.trackOpens}
          onChange={handleChange}
          readonly={readonly}
        />

        {/* Send Time - Broadcast only */}
        {mode === "broadcast" && (
          <>
            <SectionDivider />
            <SendTimeSection
              sendAt={broadcastDetails.sendAt}
              onChange={handleBroadcastChange}
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
