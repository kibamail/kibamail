"use client";

import type { SendingDomain } from "@prisma/client";

import { EmailEditorClient } from "../email-editor-client";
import type {
  AutomationEmailDetails,
  EmailEditorMutations,
  SaveDraftPayload,
  TransformedSenderIdentity,
} from "../types";

/**
 * Example adapter for automation emails (single emails within an automation workflow).
 * This demonstrates how to create adapters for automation email editing.
 *
 * Key differences from broadcasts:
 * - No recipients section (recipients come from automation triggers)
 * - No scheduling section (timing is controlled by automation workflow)
 * - Different back URL and success handling
 */

interface AutomationEmailEditorAdapterProps {
  automationId: string;
  emailId: string;
  emailName: string;
  isActive: boolean;
  initialContent?: Record<string, unknown>;
  initialStyles?: Record<string, unknown>;
  initialSubject: string;
  initialPreviewText: string;
  initialSenderIdentityId?: string;
  initialReplyToIdentityId?: string;
  initialTrackClicks?: boolean;
  initialTrackOpens?: boolean;
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];

  // Mutation handlers provided by the parent
  onSaveDraft: (payload: SaveDraftPayload<"email">) => Promise<void>;
  onActivate?: (payload: SaveDraftPayload<"email">) => Promise<void>;
  onUploadFile?: (file: File) => Promise<string>;
  onGetPreview?: () => Promise<{ html: string; hasContent: boolean }>;
}

export function AutomationEmailEditorAdapter({
  automationId,
  emailId,
  emailName,
  isActive,
  initialContent,
  initialStyles,
  initialSubject,
  initialPreviewText,
  initialSenderIdentityId,
  initialReplyToIdentityId,
  initialTrackClicks,
  initialTrackOpens,
  senderIdentities,
  domains,
  onSaveDraft,
  onActivate,
  onUploadFile,
  onGetPreview,
}: AutomationEmailEditorAdapterProps) {
  const initialDetails: AutomationEmailDetails = {
    subject: initialSubject,
    previewText: initialPreviewText,
    senderIdentityId: initialSenderIdentityId,
    replyToIdentityId: initialReplyToIdentityId,
    trackClicks: initialTrackClicks,
    trackOpens: initialTrackOpens,
  };

  const mutations: EmailEditorMutations<"email"> = {
    onSaveDraft,
    onPublish: onActivate,
    onUploadFile,
    onGetPreview,
    // Automation emails don't need readiness checks
  };

  return (
    <EmailEditorClient
      mode="email"
      entityId={emailId}
      entityName={emailName}
      isReadonly={isActive}
      initialContent={initialContent}
      initialStyles={initialStyles}
      initialDetails={initialDetails}
      senderIdentities={senderIdentities}
      domains={domains}
      mutations={mutations}
      backUrl={`/w/automations/${automationId}`}
      successRedirectUrl={`/w/automations/${automationId}`}
      labels={{
        saveDraft: "Save",
        saveDraftPending: "Saving...",
        publish: "Save & Activate",
        publishPending: "Activating...",
        title: "Automation Email",
      }}
    />
  );
}
