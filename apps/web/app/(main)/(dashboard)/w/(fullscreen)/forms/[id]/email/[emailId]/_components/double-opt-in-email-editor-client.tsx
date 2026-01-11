"use client";

import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import type { SendingDomain } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Settings, Xmark } from "iconoir-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CreatedDomain,
  TransformedSenderIdentity,
} from "@/components/sender-select";
import { internalApi } from "@/lib/api/client";
import {
  DoubleOptInDetailsTab,
  type EmailDetails,
} from "./double-opt-in-details-tab";
import {
  DoubleOptInEmailEditor,
  type DoubleOptInEmailEditorRef,
} from "./double-opt-in-email-editor";
import { DoubleOptInPreview } from "./double-opt-in-preview";

type EditorTab = "content" | "details" | "preview";

const VALID_TABS: EditorTab[] = ["content", "details", "preview"];

interface DoubleOptInEmailEditorClientProps {
  formId: string;
  formName: string;
  emailId: string;
  emailName: string;
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
}

export function DoubleOptInEmailEditorClient({
  formId,
  formName,
  emailId,
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
}: DoubleOptInEmailEditorClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stylesOpen, setStylesOpen] = useState(false);
  const editorRef = useRef<DoubleOptInEmailEditorRef>(null);
  const queryClient = useQueryClient();
  const { success: toast } = useToast();

  const tabParam = searchParams.get("tab");
  const activeTab: EditorTab = VALID_TABS.includes(tabParam as EditorTab)
    ? (tabParam as EditorTab)
    : "content";

  function setActiveTab(tab: EditorTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!tabParam || !VALID_TABS.includes(tabParam as EditorTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "content");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [tabParam, searchParams, router]);

  const [emailDetails, setEmailDetails] = useState<EmailDetails>({
    subject: initialSubject,
    previewText: initialPreviewText,
    senderIdentityId: initialSenderIdentityId,
    replyToIdentityId: initialReplyToIdentityId,
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

  const onEmailDetailsChange = useCallback(
    (updates: Partial<EmailDetails>) => {
      setEmailDetails((prev) => {
        const next = { ...prev, ...updates };

        // Reset reply-to if sender changes to different domain
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

      return internalApi.emails().update(emailId, {
        content: content as Record<string, unknown> | undefined,
        styles: styles as Record<string, unknown> | undefined,
        subject: emailDetails.subject || null,
        previewText: emailDetails.previewText || null,
        senderIdentityId: emailDetails.senderIdentityId || null,
        replyToIdentityId: emailDetails.replyToIdentityId || null,
        trackClicks: emailDetails.trackClicks,
        trackOpens: emailDetails.trackOpens,
      });
    },
    onSuccess: () => {
      toast("Draft saved successfully");
      queryClient.invalidateQueries({
        queryKey: ["email-preview", emailId],
      });
    },
  });

  function onSaveDraft() {
    saveDraftMutation.mutate();
  }

  async function onSaveAndClose() {
    await saveDraftMutation.mutateAsync();
    router.push(`/w/forms/${formId}/edit?tab=settings`);
  }

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      <div className="h-[60px] relative w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href={`/w/forms/${formId}/edit?tab=settings`}>
              <Xmark className="w-6! h-6!" />
            </Link>
          </Button>

          <div>
            <h1 className="text-lg font-semibold text-kb-content-primary">
              Confirmation Email
            </h1>
            <p className="text-xs text-kb-content-tertiary">{formName}</p>
          </div>
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
            <Eye className="w-4 h-4" />
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
          <Button
            onClick={onSaveAndClose}
            disabled={saveDraftMutation.isPending}
          >
            Save & Close
          </Button>
        </div>
      </div>

      <div className="grow rounded-lg overflow-hidden relative border border-kb-border-tertiary">
        <div
          className={`absolute inset-0 ${
            activeTab === "content"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <DoubleOptInEmailEditor
            ref={editorRef}
            emailId={emailId}
            stylesOpen={stylesOpen}
            onStylesOpenChange={setStylesOpen}
            initialContent={initialContent}
            initialStyles={initialStyles}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            activeTab === "details"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <DoubleOptInDetailsTab
            emailDetails={emailDetails}
            senderIdentities={senderIdentities}
            domains={allDomains}
            onChange={onEmailDetailsChange}
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
          className={`absolute inset-0 ${
            activeTab === "preview"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <DoubleOptInPreview
            emailId={emailId}
            isActive={activeTab === "preview"}
          />
        </div>
      </div>
    </div>
  );
}
