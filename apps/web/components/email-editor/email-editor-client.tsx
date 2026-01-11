"use client";

import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import * as Tooltip from "@kibamail/owly/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, StatUp, Xmark } from "iconoir-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getEmailFromSenderSelect,
  type TransformedSenderIdentity,
} from "@/components/sender-select";
import { ContentEditor, type ContentEditorRef } from "./content-editor";
import { EmailDetailsTab } from "./email-details-tab";
import { EmailPreview } from "./email-preview";
import { PublishButton } from "./publish-button";
import { SendTestEmailModal } from "./send-test-email-modal";
import {
  type CreatedDomain,
  type EditorDetails,
  type EditorTab,
  type EmailEditorMode,
  type EmailEditorProps,
  getDefaultLabels,
  getTabsForMode,
} from "./types";

interface EmailEditorClientProps<T extends EmailEditorMode>
  extends EmailEditorProps<T> {
  // Additional internal props if needed
}

export function EmailEditorClient<T extends EmailEditorMode>({
  mode,
  entityId,
  entityName,
  isReadonly = false,
  initialContent,
  initialStyles,
  initialDetails,
  senderIdentities,
  domains,
  mutations,
  backUrl,
  successRedirectUrl,
  labels: customLabels,
  headerExtra,
}: EmailEditorClientProps<T>) {
  const labels = { ...getDefaultLabels(mode), ...customLabels };
  const tabs = getTabsForMode(mode);
  const validTabs = tabs.filter((t) => t.enabled).map((t) => t.id);

  const searchParams = useSearchParams();
  const router = useRouter();
  const [stylesOpen, setStylesOpen] = useState(false);
  const editorRef = useRef<ContentEditorRef>(null);
  const queryClient = useQueryClient();
  const { success: toast } = useToast();

  const defaultTab: EditorTab =
    isReadonly && mode === "broadcast" ? "analytics" : "content";
  const tabParam = searchParams.get("tab");
  const activeTab: EditorTab = validTabs.includes(tabParam as EditorTab)
    ? (tabParam as EditorTab)
    : defaultTab;

  function setActiveTab(tab: EditorTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!tabParam || !validTabs.includes(tabParam as EditorTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", defaultTab);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [tabParam, defaultTab, validTabs, searchParams, router]);

  const [details, setDetails] = useState<EditorDetails<T>>(initialDetails);
  const [addedDomains, setAddedDomains] = useState<CreatedDomain[]>([]);
  const [addedSenderIdentities, setAddedSenderIdentities] = useState<
    TransformedSenderIdentity[]
  >([]);
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);

  const allDomains = useMemo(
    () => [...domains, ...addedDomains],
    [domains, addedDomains],
  );

  const allSenderIdentities = useMemo(
    () => [...senderIdentities, ...addedSenderIdentities],
    [senderIdentities, addedSenderIdentities],
  );

  const onDetailsChange = useCallback(
    (updates: Partial<EditorDetails<T>>) => {
      setDetails((prev) => {
        const next = { ...prev, ...updates };

        // Clear reply-to when sender domain changes
        if (
          updates.senderIdentityId !== undefined &&
          updates.senderIdentityId !== prev.senderIdentityId
        ) {
          const prevSender = allSenderIdentities.find(
            (s) => s.id === prev.senderIdentityId,
          );
          const nextSender = allSenderIdentities.find(
            (s) => s.id === updates.senderIdentityId,
          );

          if (prevSender?.domainId !== nextSender?.domainId) {
            next.replyToIdentityId = undefined;
          }
        }

        return next;
      });
    },
    [allSenderIdentities],
  );

  const onDomainCreated = useCallback((domain: CreatedDomain) => {
    setAddedDomains((prev) => [...prev, domain]);
  }, []);

  const onSenderIdentityCreated = useCallback(
    (identity: TransformedSenderIdentity) => {
      setAddedSenderIdentities((prev) => [...prev, identity]);
    },
    [],
  );

  const getSavePayload = useCallback(() => {
    const content = editorRef.current?.getContent();
    const styles = editorRef.current?.getStyles();

    const senderEmail = getEmailFromSenderSelect({
      senderIdentities: allSenderIdentities,
      senderIdentityId: details.senderIdentityId,
    });

    return {
      emailContent: {
        subject: details.subject,
        previewText: details.previewText,
        contentJson: content as Record<string, unknown> | undefined,
        styles: styles as Record<string, unknown> | undefined,
      },
      details,
      senderEmail,
    };
  }, [details, allSenderIdentities]);

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = getSavePayload();
      await mutations.onSaveDraft(payload);
    },
    onSuccess: () => {
      toast("Draft saved successfully");
      queryClient.invalidateQueries({
        queryKey: ["email-preview", entityId],
      });
    },
  });

  function onSaveDraft() {
    saveDraftMutation.mutate();
  }

  async function onSaveDraftAsync() {
    await saveDraftMutation.mutateAsync();
  }

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      {/* Header */}
      <div className="h-[60px] relative w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href={backUrl}>
              <Xmark className="w-6! h-6!" />
            </Link>
          </Button>

          <h1 className="text-lg font-semibold text-kb-content-primary">
            {entityName}
          </h1>

          {headerExtra}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 absolute left-[50%] translate-x-[-50%]">
          {tabs.map((tab, index) => (
            <div key={tab.id} className="flex items-center gap-3">
              {index > 0 && <div className="w-12 h-px bg-kb-border-tertiary" />}
              <Button
                className="rounded-full!"
                variant={activeTab === tab.id ? "secondary" : "tertiary"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
              </Button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span>
                  <Button
                    variant="secondary"
                    onClick={() => setStylesOpen((current) => !current)}
                    disabled={isReadonly}
                  >
                    <Settings className="w-4 h-4" />
                    Styles
                  </Button>
                </span>
              </Tooltip.Trigger>
              {isReadonly && (
                <Tooltip.Content side="bottom" sideOffset={8}>
                  Only draft versions can be edited
                </Tooltip.Content>
              )}
            </Tooltip.Root>
          </Tooltip.Provider>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span>
                  <Button
                    variant="secondary"
                    onClick={onSaveDraft}
                    disabled={isReadonly || saveDraftMutation.isPending}
                  >
                    {saveDraftMutation.isPending
                      ? labels.saveDraftPending
                      : labels.saveDraft}
                  </Button>
                </span>
              </Tooltip.Trigger>
              {isReadonly && (
                <Tooltip.Content side="bottom" sideOffset={8}>
                  Only draft versions can be edited
                </Tooltip.Content>
              )}
            </Tooltip.Root>
          </Tooltip.Provider>
          {mode === "broadcast" && (
            <Button
              variant="secondary"
              onClick={() => setTestEmailModalOpen(true)}
              disabled={isReadonly}
            >
              Send test email
            </Button>
          )}
          {mutations.onPublish && (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span>
                    <PublishButton
                      mode={mode}
                      entityId={entityId}
                      onSaveDraft={onSaveDraftAsync}
                      isSavingDraft={saveDraftMutation.isPending}
                      onCheckReadiness={mutations.onCheckReadiness}
                      onPublish={async () => {
                        const payload = getSavePayload();
                        await mutations.onPublish?.(payload);
                      }}
                      successRedirectUrl={successRedirectUrl}
                      labels={labels}
                      disabled={isReadonly}
                    />
                  </span>
                </Tooltip.Trigger>
                {isReadonly && (
                  <Tooltip.Content side="bottom" sideOffset={8}>
                    Only draft versions can be published
                  </Tooltip.Content>
                )}
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grow rounded-lg overflow-hidden relative border border-kb-border-tertiary">
        {/* Content Tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "content"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <ContentEditor
            ref={editorRef}
            entityId={entityId}
            stylesOpen={stylesOpen}
            onStylesOpenChange={setStylesOpen}
            initialContent={initialContent}
            initialStyles={initialStyles}
            readonly={isReadonly}
            onUpload={mutations.onUploadFile}
            mode={mode}
          />
        </div>

        {/* Details Tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "details"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <EmailDetailsTab
            mode={mode}
            details={details}
            senderIdentities={allSenderIdentities}
            domains={allDomains}
            onChange={onDetailsChange}
            onSave={onSaveDraft}
            isSaving={saveDraftMutation.isPending}
            onSenderIdentityCreated={onSenderIdentityCreated}
            onDomainCreated={onDomainCreated}
            readonly={isReadonly}
          />
        </div>

        {/* Preview Tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "preview"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <EmailPreview
            entityId={entityId}
            isActive={activeTab === "preview"}
            onGetPreview={mutations.onGetPreview}
          />
        </div>

        {/* Analytics Tab (broadcast only) */}
        {mode === "broadcast" && (
          <div
            className={`absolute inset-0 ${
              activeTab === "analytics"
                ? "visible"
                : "invisible pointer-events-none"
            }`}
          >
            <AnalyticsPlaceholder />
          </div>
        )}
      </div>

      {/* Send Test Email Modal (broadcast only) */}
      {mode === "broadcast" && (
        <SendTestEmailModal
          open={testEmailModalOpen}
          onOpenChange={setTestEmailModalOpen}
          broadcastId={entityId}
          onSaveDraft={onSaveDraftAsync}
        />
      )}
    </div>
  );
}

function AnalyticsPlaceholder() {
  return (
    <div className="h-full w-full bg-kb-bg-primary flex items-center justify-center">
      <div className="text-center">
        <StatUp className="w-12 h-12 text-kb-content-tertiary mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-kb-content-primary mb-2">
          Analytics coming soon
        </h2>
        <p className="text-kb-content-secondary max-w-md">
          Track opens, clicks, and engagement metrics for your broadcast once it
          has been sent.
        </p>
      </div>
    </div>
  );
}
