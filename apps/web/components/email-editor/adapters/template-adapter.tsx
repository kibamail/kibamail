"use client";

import { useRef, useCallback } from "react";
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
  VersionDropdown,
  type VersionItem,
} from "@/components/version-dropdown";
import type { VariableDefinition } from "@/app/(main)/api/internal/v1/email-templates/schema";

interface TemplateEditorAdapterProps {
  templateId: string;
  templateName: string;
  templateDescription?: string | null;
  status: EmailTemplateStatus;
  version: number;
  rootTemplateId: string;
  versions: VersionItem[];
  isLiveVersion: boolean;
  initialContent?: Record<string, unknown>;
  initialStyles?: Record<string, unknown>;
  initialContentHtml?: string | null;
  initialSubject?: string;
  initialPreviewText?: string;
  initialVariables?: VariableDefinition[];
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
  initialContentHtml,
  initialSubject,
  initialPreviewText,
  initialVariables,
  initialSenderIdentityId,
  initialReplyToIdentityId,
  initialTrackClicks,
  initialTrackOpens,
  senderIdentities,
  domains,
}: TemplateEditorAdapterProps) {
  const isReadonly = status !== "DRAFT";

  // Track current variables for incremental updates
  const variablesRef = useRef<VariableDefinition[]>(initialVariables ?? []);

  const handleVariableCreate = useCallback(async (variable: VariableDefinition) => {
    const updatedVariables = [...variablesRef.current, variable];
    variablesRef.current = updatedVariables;

    await internalApi.emailTemplates().update(templateId, {
      emailContent: { variables: updatedVariables },
    });
  }, [templateId]);

  const handleVariableUpdate = useCallback(async (variable: VariableDefinition) => {
    const updatedVariables = variablesRef.current.map(v =>
      v.id === variable.id ? variable : v
    );
    variablesRef.current = updatedVariables;

    await internalApi.emailTemplates().update(templateId, {
      emailContent: { variables: updatedVariables },
    });
  }, [templateId]);

  const handleVariableDelete = useCallback(async (id: string) => {
    const updatedVariables = variablesRef.current.filter(v => v.id !== id);
    variablesRef.current = updatedVariables;

    await internalApi.emailTemplates().update(templateId, {
      emailContent: { variables: updatedVariables },
    });
  }, [templateId]);

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
    <VersionDropdown
      currentId={templateId}
      currentVersion={version}
      currentStatus={status}
      rootId={rootTemplateId}
      versions={versions}
      isLiveVersion={isLiveVersion}
      basePath="/w/templates"
      queryKey="email-template"
      onCreateVersion={(rootId) => internalApi.emailTemplates().createVersion(rootId)}
      onPublish={(id) => internalApi.emailTemplates().publish(id)}
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
      initialContentHtml={initialContentHtml}
      initialDetails={initialDetails}
      senderIdentities={senderIdentities}
      domains={domains}
      mutations={mutations}
      backUrl="/w/templates"
      successRedirectUrl="/w/templates"
      headerExtra={versionDropdown}
      customVariables={initialVariables}
      allowCustomVariables={!isReadonly}
      onVariableCreate={handleVariableCreate}
      onVariableUpdate={handleVariableUpdate}
      onVariableDelete={handleVariableDelete}
    />
  );
}
