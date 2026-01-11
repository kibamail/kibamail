"use client";

import type { EmailTemplateStatus, SendingDomain } from "@prisma/client";

import { EmailEditorClient } from "@/components/email-editor/email-editor-client";
import type {
  EmailEditorMutations,
  SaveDraftPayload,
  TemplateDetails,
  TransformedSenderIdentity,
} from "@/components/email-editor/types";
import { internalApi } from "@/lib/api/client";
import {
  TemplateVersionDropdown,
  type TemplateVersionItem,
} from "@/app/(main)/(dashboard)/w/(fullscreen)/templates/[id]/_components/template-version-dropdown";

interface TemplateEditorAdapterProps {
  templateId: string;
  templateName: string;
  templateDescription?: string | null;
  status: EmailTemplateStatus;
  version: number;
  rootTemplateId: string;
  versions: TemplateVersionItem[];
  isLiveVersion: boolean;
  initialContent?: Record<string, unknown>;
  initialStyles?: Record<string, unknown>;
  initialSubject?: string;
  initialPreviewText?: string;
  initialSenderIdentityId?: string;
  initialReplyToIdentityId?: string;
  initialTrackClicks?: boolean;
  initialTrackOpens?: boolean;
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];
}

export function TemplateEditorAdapter({
  templateId,
  templateName,
  templateDescription,
  status,
  version,
  rootTemplateId,
  versions,
  isLiveVersion,
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
}: TemplateEditorAdapterProps) {
  const isReadonly = status !== "DRAFT";

  const initialDetails: TemplateDetails = {
    subject: initialSubject || "",
    previewText: initialPreviewText || "",
    senderIdentityId: initialSenderIdentityId,
    replyToIdentityId: initialReplyToIdentityId,
    trackClicks: initialTrackClicks,
    trackOpens: initialTrackOpens,
    templateName: templateName,
    templateDescription: templateDescription || undefined,
  };

  const mutations: EmailEditorMutations<"template"> = {
    onSaveDraft: async (payload: SaveDraftPayload<"template">) => {
      const { emailContent, details } = payload;
      const templateDetails = details as TemplateDetails;

      await internalApi.emailTemplates().update(templateId, {
        name: templateDetails.templateName,
        description: templateDetails.templateDescription || null,
        emailContent: {
          contentJson: emailContent.contentJson,
          styles: emailContent.styles,
          subject: emailContent.subject || null,
          previewText: emailContent.previewText || null,
        },
        senderIdentityId: templateDetails.senderIdentityId || null,
        replyToIdentityId: templateDetails.replyToIdentityId || null,
        trackClicks: templateDetails.trackClicks,
        trackOpens: templateDetails.trackOpens,
      });
    },

    onPublish: async () => {
      await internalApi.emailTemplates().publish(templateId);
    },

    onGetPreview: async () => {
      return internalApi.emailTemplates().preview(templateId);
    },
  };

  const versionDropdown = (
    <TemplateVersionDropdown
      currentTemplateId={templateId}
      currentVersion={version}
      currentStatus={status}
      rootTemplateId={rootTemplateId}
      versions={versions}
      isLiveVersion={isLiveVersion}
    />
  );

  return (
    <EmailEditorClient
      mode="template"
      entityId={templateId}
      entityName={templateName}
      isReadonly={isReadonly}
      initialContent={initialContent}
      initialStyles={initialStyles}
      initialDetails={initialDetails}
      senderIdentities={senderIdentities}
      domains={domains}
      mutations={mutations}
      backUrl="/w/templates"
      successRedirectUrl="/w/templates"
      headerExtra={versionDropdown}
    />
  );
}
