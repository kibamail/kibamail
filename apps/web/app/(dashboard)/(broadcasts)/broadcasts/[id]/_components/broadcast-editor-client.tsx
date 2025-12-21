"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import { Xmark, Settings, StatUp } from "iconoir-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { SendingDomain, BroadcastStatus } from "@prisma/client";

dayjs.extend(utc);
import {
  BroadcastEmailEditor,
  type BroadcastEmailEditorRef,
} from "./broadcast-email-editor";
import { BroadcastPreview } from "./broadcast-preview";
import {
  BroadcastDetailsTab,
  type BroadcastDetails,
} from "./broadcast-details-tab";
import { internalApi } from "@/lib/api/client";
import {
  type TransformedSenderIdentity,
  type CreatedDomain,
  getEmailFromSenderSelect,
} from "@/components/sender-select";
import { SendBroadcastButton } from "./send-broadcast-button";
import Link from "next/link";

type EditorTab = "content" | "details" | "preview" | "analytics";

const VALID_TABS: EditorTab[] = ["content", "details", "preview", "analytics"];

interface BroadcastEditorClientProps {
  broadcastId: string;
  broadcastName: string;
  status: BroadcastStatus;
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

export function BroadcastEditorClient({
  broadcastId,
  broadcastName,
  status,
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
}: BroadcastEditorClientProps) {
  const isReadonly = status !== "DRAFT";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stylesOpen, setStylesOpen] = useState(false);
  const editorRef = useRef<BroadcastEmailEditorRef>(null);
  const queryClient = useQueryClient();
  const { success: toast } = useToast();

  const defaultTab: EditorTab = status === "DRAFT" ? "content" : "analytics";
  const tabParam = searchParams.get("tab");
  const activeTab: EditorTab = VALID_TABS.includes(tabParam as EditorTab)
    ? (tabParam as EditorTab)
    : defaultTab;

  function setActiveTab(tab: EditorTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!tabParam || !VALID_TABS.includes(tabParam as EditorTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", defaultTab);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [tabParam, defaultTab, searchParams, router]);

  // Convert initialSendAt from UTC (database) to local time for display
  const initialSendAtLocal = initialSendAt
    ? dayjs.utc(initialSendAt).local().toDate()
    : undefined;

  const [broadcastDetails, setBroadcastDetails] = useState<BroadcastDetails>({
    subject: initialSubject,
    previewText: initialPreviewText,
    senderIdentityId: initialSenderIdentityId,
    replyToIdentityId: initialReplyToIdentityId,
    topicId: initialTopicId,
    segmentId: initialSegmentId,
    sendAt: initialSendAtLocal,
    trackClicks: initialTrackClicks,
    trackOpens: initialTrackOpens,
  });
  const [addedDomains, setAddedDomains] = useState<CreatedDomain[]>([]);
  const [senderLocalPart, setSenderLocalPart] = useState("");
  const [senderDomainId, setSenderDomainId] = useState(domains[0]?.id || "");
  const [isAddingNewSender, setIsAddingNewSender] = useState(
    !initialSenderIdentityId && senderIdentities.length === 0
  );

  const allDomains = [...domains, ...addedDomains];

  const onBroadcastDetailsChange = useCallback(
    (updates: Partial<BroadcastDetails>) => {
      setBroadcastDetails((prev) => {
        const next = { ...prev, ...updates };

        // Clear replyToIdentityId if senderIdentityId changes to a different domain
        if (
          updates.senderIdentityId !== undefined &&
          updates.senderIdentityId !== prev.senderIdentityId
        ) {
          const prevSender = senderIdentities.find(
            (s) => s.id === prev.senderIdentityId
          );
          const nextSender = senderIdentities.find(
            (s) => s.id === updates.senderIdentityId
          );

          if (prevSender?.domainId !== nextSender?.domainId) {
            next.replyToIdentityId = undefined;
          }
        }

        return next;
      });
    },
    [senderIdentities]
  );

  const onDomainCreated = useCallback((domain: CreatedDomain) => {
    setAddedDomains((prev) => [...prev, domain]);
  }, []);

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const content = editorRef.current?.getContent();
      const styles = editorRef.current?.getStyles();

      const from = getEmailFromSenderSelect({
        senderIdentities,
        domains: allDomains,
        senderIdentityId: broadcastDetails.senderIdentityId,
        localPart: senderLocalPart,
        domainId: senderDomainId,
        isAddingNew: isAddingNewSender || senderIdentities.length === 0,
      });

      // Convert sendAt to UTC before saving
      const sendAtUtc = broadcastDetails.sendAt
        ? dayjs(broadcastDetails.sendAt).utc().toDate()
        : null;

      return internalApi.broadcasts().update(broadcastId, {
        emailContent: {
          contentJson: content as Record<string, unknown> | undefined,
          styles: styles as Record<string, unknown> | undefined,
          subject: broadcastDetails.subject || undefined,
          previewText: broadcastDetails.previewText || undefined,
        },
        from,
        replyToIdentityId: broadcastDetails.replyToIdentityId || null,
        topicId: broadcastDetails.topicId || null,
        segmentId: broadcastDetails.segmentId || null,
        sendAt: sendAtUtc,
        trackClicks: broadcastDetails.trackClicks ?? null,
        trackOpens: broadcastDetails.trackOpens ?? null,
      });
    },
    onSuccess: () => {
      toast("Draft saved successfully");
      queryClient.invalidateQueries({
        queryKey: ["broadcast-preview", broadcastId],
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
      <div className="h-[60px] relative w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href="/w/broadcasts">
              <Xmark className="w-6! h-6!" />
            </Link>
          </Button>

          <h1 className="text-lg font-semibold text-kb-content-primary">
            {broadcastName}
          </h1>
        </div>

        <div className="flex items-center gap-3 absolute left-[50%] translate-x-[-50%]">
          <Button
            className="rounded-full!"
            variant={activeTab === "content" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("content")}
          >
            Content
          </Button>
          <div className="w-12 h-px bg-kb-border-tertiary"></div>
          <Button
            className="rounded-full!"
            variant={activeTab === "details" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("details")}
          >
            Details
          </Button>
          <div className="w-12 h-px bg-kb-border-tertiary"></div>
          <Button
            className="rounded-full!"
            variant={activeTab === "preview" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </Button>
          <div className="w-12 h-px bg-kb-border-tertiary"></div>
          <Button
            className="rounded-full!"
            variant={activeTab === "analytics" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("analytics")}
          >
            <StatUp className="w-4 h-4" />
            Analytics
          </Button>
        </div>

        {!isReadonly && (
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => setStylesOpen((current) => !current)}
            >
              <Settings className="w-4 h-4" />
              Styles
            </Button>
            <Button
              variant="secondary"
              onClick={onSaveDraft}
              disabled={saveDraftMutation.isPending}
            >
              {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
            </Button>
            <SendBroadcastButton
              broadcastId={broadcastId}
              onSaveDraft={onSaveDraftAsync}
              isSavingDraft={saveDraftMutation.isPending}
            />
          </div>
        )}
      </div>

      <div className="grow rounded-lg overflow-hidden relative border border-kb-border-tertiary">
        <div
          className={`absolute inset-0 ${
            activeTab === "content"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <BroadcastEmailEditor
            ref={editorRef}
            broadcastId={broadcastId}
            stylesOpen={stylesOpen}
            onStylesOpenChange={setStylesOpen}
            initialContent={initialContent}
            initialStyles={initialStyles}
            readonly={isReadonly}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            activeTab === "details"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <BroadcastDetailsTab
            broadcast={broadcastDetails}
            senderIdentities={senderIdentities}
            domains={allDomains}
            onChange={onBroadcastDetailsChange}
            onSave={onSaveDraft}
            isSaving={saveDraftMutation.isPending}
            senderState={{
              localPart: senderLocalPart,
              domainId: senderDomainId,
              isAddingNew: isAddingNewSender,
            }}
            senderActions={{
              onLocalPartChange: setSenderLocalPart,
              onDomainIdChange: setSenderDomainId,
              onIsAddingNewChange: setIsAddingNewSender,
              onDomainCreated,
            }}
            readonly={isReadonly}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            activeTab === "preview"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <BroadcastPreview
            broadcastId={broadcastId}
            isActive={activeTab === "preview"}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            activeTab === "analytics"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <BroadcastAnalyticsPlaceholder />
        </div>
      </div>
    </div>
  );
}

function BroadcastAnalyticsPlaceholder() {
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
