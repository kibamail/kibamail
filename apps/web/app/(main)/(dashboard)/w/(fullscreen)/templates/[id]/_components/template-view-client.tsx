"use client";

import { Button } from "@kibamail/owly/button";
import { SendDiagonal, Settings, Xmark } from "iconoir-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { TemplateDetailsTab } from "./template-details-tab";
import { TemplateEditor, type TemplateEditorRef } from "./template-editor";

type ViewTab = "content" | "details" | "preview";

const VALID_TABS: ViewTab[] = ["content", "details", "preview"];

interface TemplateViewClientProps {
  templateName: string;
  templateDescription?: string;
  subject: string;
  previewText?: string;
  senderEmail?: string;
  replyToEmail?: string;
  trackClicks: boolean;
  trackOpens: boolean;
  contentJson?: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

export function TemplateViewClient({
  templateName,
  templateDescription,
  subject,
  previewText,
  senderEmail,
  replyToEmail,
  trackClicks,
  trackOpens,
}: TemplateViewClientProps) {
  const searchParams = useSearchParams();
  const [stylesOpen, setStylesOpen] = useState(false);
  const editorRef = useRef<TemplateEditorRef>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: ViewTab = VALID_TABS.includes(tabParam as ViewTab)
    ? (tabParam as ViewTab)
    : "content";

  function setActiveTab(tab: ViewTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  function handleSave() {
    console.log("Save clicked");
  }

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      <div className="h-[60px] relative w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href="/w/templates">
              <Xmark className="w-6! h-6!" />
            </Link>
          </Button>

          <div>
            <h1 className="text-lg font-semibold text-kb-content-primary">
              {templateName}
            </h1>
            {templateDescription && (
              <p className="text-xs text-kb-content-tertiary">
                {templateDescription}
              </p>
            )}
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
          <Button variant="secondary">
            <SendDiagonal className="w-4 h-4" />
            Send Test
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
          <TemplateEditor
            ref={editorRef}
            stylesOpen={stylesOpen}
            onStylesOpenChange={setStylesOpen}
          />
        </div>

        <div
          className={`absolute inset-0 ${
            activeTab === "details"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <TemplateDetailsTab
            subject={subject}
            previewText={previewText}
            senderEmail={senderEmail}
            replyToEmail={replyToEmail}
            trackClicks={trackClicks}
            trackOpens={trackOpens}
            onSave={handleSave}
            isSaving={false}
          />
        </div>

        <div
          className={`absolute inset-0 ${
            activeTab === "preview"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <div className="h-full w-full flex flex-col bg-kb-surface-secondary overflow-auto">
            <div className="flex items-center justify-center h-full">
              Preview content
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
