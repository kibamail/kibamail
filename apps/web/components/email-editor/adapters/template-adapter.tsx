"use client";

import type { SendingDomain } from "@prisma/client";

import { EmailEditorClient } from "@/components/email-editor/email-editor-client";
import type {
  TemplateDetails,
  EmailEditorMutations,
  SaveDraftPayload,
  TransformedSenderIdentity,
} from "@/components/email-editor/types";

/**
 * Example adapter for email templates (transactional emails).
 * This demonstrates how to create adapters for different email editing modes.
 *
 * To use this adapter, you would:
 * 1. Create API endpoints for template operations (update, preview, etc.)
 * 2. Implement the mutations that call those endpoints
 * 3. Pass the template data as props
 */

interface TemplateEditorAdapterProps {
  templateId: string;
  templateName: string;
  isPublished: boolean;
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
  onSaveDraft: (payload: SaveDraftPayload<"template">) => Promise<void>;
  onPublish?: (payload: SaveDraftPayload<"template">) => Promise<void>;
  onUploadFile?: (file: File) => Promise<string>;
  onGetPreview?: () => Promise<{ html: string; hasContent: boolean }>;
}

export function TemplateEditorAdapter({
  templateId,
  templateName,
  isPublished,
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
  onPublish,
  onUploadFile,
  onGetPreview,
}: TemplateEditorAdapterProps) {
  const initialDetails: TemplateDetails = {
    subject: initialSubject,
    previewText: initialPreviewText,
    senderIdentityId: initialSenderIdentityId,
    replyToIdentityId: initialReplyToIdentityId,
    trackClicks: initialTrackClicks,
    trackOpens: initialTrackOpens,
  };

  const mutations: EmailEditorMutations<"template"> = {
    onSaveDraft,
    onPublish,
    onUploadFile,
    onGetPreview,
  };

  return (
    <EmailEditorClient
      mode="template"
      entityId={templateId}
      entityName={templateName}
      isReadonly={isPublished}
      initialContent={initialContent}
      initialStyles={initialStyles}
      initialDetails={initialDetails}
      senderIdentities={senderIdentities}
      domains={domains}
      mutations={mutations}
      backUrl="/w/templates"
      successRedirectUrl="/w/templates"
      labels={{
        saveDraft: "Save Draft",
        saveDraftPending: "Saving...",
        publish: "Publish Template",
        publishPending: "Publishing...",
        title: "Template",
      }}
    />
  );
}
