"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import { Xmark, Settings } from "iconoir-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { SendingDomain } from "@prisma/client";

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

type EditorTab = "content" | "details" | "preview";

interface BroadcastEditorClientProps {
  broadcastId: string;
  broadcastName: string;
  initialContent?: Record<string, unknown>;
  initialStyles?: Record<string, unknown>;
  initialSubject: string;
  initialPreviewText: string;
  initialSenderIdentityId?: string;
  initialTopicId?: string;
  initialSegmentId?: string;
  initialSendAt?: Date;
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];
}

export function BroadcastEditorClient({
  broadcastId,
  broadcastName,
  initialContent,
  initialStyles,
  initialSubject,
  initialPreviewText,
  initialSenderIdentityId,
  initialTopicId,
  initialSegmentId,
  initialSendAt,
  senderIdentities,
  domains,
}: BroadcastEditorClientProps) {
  const [stylesOpen, setStylesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const editorRef = useRef<BroadcastEmailEditorRef>(null);
  const queryClient = useQueryClient();
  const { success: toast } = useToast();

  // Convert initialSendAt from UTC (database) to local time for display
  const initialSendAtLocal = initialSendAt
    ? dayjs.utc(initialSendAt).local().toDate()
    : undefined;

  const [broadcastDetails, setBroadcastDetails] = useState<BroadcastDetails>({
    subject: initialSubject,
    previewText: initialPreviewText,
    senderIdentityId: initialSenderIdentityId,
    topicId: initialTopicId,
    segmentId: initialSegmentId,
    sendAt: initialSendAtLocal,
  });
  const [addedDomains, setAddedDomains] = useState<CreatedDomain[]>([]);
  const [senderLocalPart, setSenderLocalPart] = useState("");
  const [senderDomainId, setSenderDomainId] = useState(domains[0]?.id || "");
  const [isAddingNewSender, setIsAddingNewSender] = useState(!initialSenderIdentityId && senderIdentities.length === 0);

  const allDomains = [...domains, ...addedDomains];

  const onBroadcastDetailsChange = useCallback(
    (updates: Partial<BroadcastDetails>) => {
      setBroadcastDetails((prev) => ({ ...prev, ...updates }));
    },
    []
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
        topicId: broadcastDetails.topicId || null,
        segmentId: broadcastDetails.segmentId || null,
        sendAt: sendAtUtc,
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
        </div>

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
      </div>

      <div className="grow rounded-lg overflow-hidden relative">
        <div
          className={`absolute inset-0 ${activeTab === "content" ? "visible" : "invisible pointer-events-none"}`}
        >
          <BroadcastEmailEditor
            ref={editorRef}
            broadcastId={broadcastId}
            stylesOpen={stylesOpen}
            onStylesOpenChange={setStylesOpen}
            initialContent={initialContent}
            initialStyles={initialStyles}
          />
        </div>
        <div
          className={`absolute inset-0 ${activeTab === "details" ? "visible" : "invisible pointer-events-none"}`}
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
          />
        </div>
        <div
          className={`absolute inset-0 ${activeTab === "preview" ? "visible" : "invisible pointer-events-none"}`}
        >
          <BroadcastPreview broadcastId={broadcastId} isActive={activeTab === "preview"} />
        </div>
      </div>
    </div>
  );
}
