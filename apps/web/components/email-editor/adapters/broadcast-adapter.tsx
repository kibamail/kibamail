"use client";

import type {
  BroadcastSource,
  BroadcastStatus,
  SendingDomain,
} from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { EmailEditorClient } from "@/components/email-editor/email-editor-client";
import type {
  BroadcastDetails,
  EmailEditorMutations,
  SaveDraftPayload,
  TransformedSenderIdentity,
} from "@/components/email-editor/types";
import { internalApi } from "@/lib/api/client";

dayjs.extend(utc);

interface BroadcastEditorAdapterProps {
  broadcastId: string;
  broadcastName: string;
  status: BroadcastStatus;
  sourceType: BroadcastSource;
  initialContent?: Record<string, unknown>;
  initialStyles?: Record<string, unknown>;
  initialSubject: string;
  initialPreviewText: string;
  initialSenderIdentityId?: string;
  initialTopicId?: string;
  initialSegmentId?: string;
  initialSendAt?: Date;
  initialTrackClicks?: boolean;
  initialTrackOpens?: boolean;
  initialReplyToIdentityId?: string;
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];
}

export function BroadcastEditorAdapter({
  broadcastId,
  broadcastName,
  status,
  sourceType,
  initialContent,
  initialStyles,
  initialSubject,
  initialPreviewText,
  initialSenderIdentityId,
  initialTopicId,
  initialSegmentId,
  initialSendAt,
  initialTrackClicks,
  initialTrackOpens,
  initialReplyToIdentityId,
  senderIdentities,
  domains,
}: BroadcastEditorAdapterProps) {
  const isReadonly = status !== "DRAFT";

  const initialSendAtLocal = initialSendAt
    ? dayjs.utc(initialSendAt).local().toDate()
    : undefined;

  const initialDetails: BroadcastDetails = {
    subject: initialSubject,
    previewText: initialPreviewText,
    senderIdentityId: initialSenderIdentityId,
    replyToIdentityId: initialReplyToIdentityId,
    topicId: initialTopicId,
    segmentId: initialSegmentId,
    sendAt: initialSendAtLocal,
    trackClicks: initialTrackClicks,
    trackOpens: initialTrackOpens,
  };

  const mutations: EmailEditorMutations<"broadcast"> = {
    onSaveDraft: async (payload: SaveDraftPayload<"broadcast">) => {
      const { emailContent, details, senderEmail } = payload;
      const broadcastDetails = details as BroadcastDetails;

      const sendAtUtc = broadcastDetails.sendAt
        ? dayjs(broadcastDetails.sendAt).utc().toDate()
        : null;

      await internalApi.broadcasts().update(broadcastId, {
        emailContent: {
          contentJson: emailContent.contentJson,
          styles: emailContent.styles,
          subject: emailContent.subject || undefined,
          previewText: emailContent.previewText || undefined,
        },
        from: senderEmail,
        replyToIdentityId: broadcastDetails.replyToIdentityId || null,
        topicId: broadcastDetails.topicId || null,
        segmentId: broadcastDetails.segmentId || null,
        sendAt: sendAtUtc,
        trackClicks: broadcastDetails.trackClicks ?? null,
        trackOpens: broadcastDetails.trackOpens ?? null,
      });
    },

    onPublish: async () => {
      await internalApi.broadcasts().send(broadcastId);
    },

    onUploadFile: async (file: File) => {
      const result = await internalApi
        .broadcasts()
        .uploadFiles(broadcastId, [file]);

      if (result.files.length > 0) {
        return result.files[0].url;
      }

      throw new Error("Upload failed - no file URL returned");
    },

    onGetPreview: async () => {
      return internalApi.broadcasts().preview(broadcastId);
    },

    onCheckReadiness: async () => {
      return internalApi.broadcasts().readiness(broadcastId);
    },
  };

  return (
    <EmailEditorClient
      mode="broadcast"
      entityId={broadcastId}
      entityName={broadcastName}
      isReadonly={isReadonly}
      sourceType={sourceType}
      initialContent={initialContent}
      initialStyles={initialStyles}
      initialDetails={initialDetails}
      senderIdentities={senderIdentities}
      domains={domains}
      mutations={mutations}
      backUrl="/w/broadcasts"
      successRedirectUrl="/w/broadcasts"
    />
  );
}
