"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@kibamail/owly/button";
import { Xmark, StatUp, Settings, Eye, EditPencil } from "iconoir-react";
import Link from "next/link";

import { FormBuilderProvider } from "./form-builder-context";
import { FieldsSidebar } from "./fields-sidebar";
import { FormCanvas } from "./form-canvas";
import type { FormSchema } from "./types";

type EditorTab = "create" | "settings" | "preview" | "analytics";

const VALID_TABS: EditorTab[] = ["create", "settings", "preview", "analytics"];

interface FormBuilderClientProps {
  formId: string;
  formName: string;
  initialSchema: FormSchema | null;
}

export function FormBuilderClient({
  formId,
  formName,
  initialSchema,
}: FormBuilderClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab: EditorTab = VALID_TABS.includes(tabParam as EditorTab)
    ? (tabParam as EditorTab)
    : "create";

  function setActiveTab(tab: EditorTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!tabParam || !VALID_TABS.includes(tabParam as EditorTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "create");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [tabParam, searchParams, router]);

  return (
    <FormBuilderProvider
      formId={formId}
      formName={formName}
      initialSchema={initialSchema}
    >
      <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
        {/* Header */}
        <div className="h-[60px] relative w-full flex items-center justify-between px-3 shrink-0">
          {/* Left: close button and name */}
          <div className="flex items-center gap-4">
            <Button variant="tertiary" asChild>
              <Link href="/w/forms">
                <Xmark className="w-6! h-6!" />
              </Link>
            </Button>

            <h1 className="text-lg font-semibold text-kb-content-primary">
              {formName}
            </h1>
          </div>

          {/* Center: tabs */}
          <div className="flex items-center gap-3 absolute left-[50%] translate-x-[-50%]">
            <Button
              className="rounded-full!"
              variant={activeTab === "create" ? "secondary" : "tertiary"}
              onClick={() => setActiveTab("create")}
            >
              Create
            </Button>
            <div className="w-12 h-px bg-kb-border-tertiary"></div>
            <Button
              className="rounded-full!"
              variant={activeTab === "settings" ? "secondary" : "tertiary"}
              onClick={() => setActiveTab("settings")}
            >
              Settings
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

          {/* Right: action buttons */}
          <div className="flex items-center gap-4">
            <Button variant="secondary">Save Draft</Button>
            <Button>Publish</Button>
          </div>
        </div>

        {/* Content area */}
        <div className="grow rounded-lg overflow-hidden relative border border-kb-border-tertiary">
          {/* Create tab */}
          <div
            className={`absolute inset-0 flex ${
              activeTab === "create" ? "visible" : "invisible pointer-events-none"
            }`}
          >
            <FieldsSidebar />
            <FormCanvas />
          </div>

          {/* Settings tab */}
          <div
            className={`absolute inset-0 ${
              activeTab === "settings" ? "visible" : "invisible pointer-events-none"
            }`}
          >
            <FormSettingsPlaceholder />
          </div>

          {/* Preview tab */}
          <div
            className={`absolute inset-0 ${
              activeTab === "preview" ? "visible" : "invisible pointer-events-none"
            }`}
          >
            <FormPreviewPlaceholder />
          </div>

          {/* Analytics tab */}
          <div
            className={`absolute inset-0 ${
              activeTab === "analytics" ? "visible" : "invisible pointer-events-none"
            }`}
          >
            <FormAnalyticsPlaceholder />
          </div>
        </div>
      </div>
    </FormBuilderProvider>
  );
}

function FormSettingsPlaceholder() {
  return (
    <div className="h-full w-full bg-kb-bg-primary flex items-center justify-center">
      <div className="text-center">
        <Settings className="w-12 h-12 text-kb-content-tertiary mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-kb-content-primary mb-2">
          Form Settings
        </h2>
        <p className="text-kb-content-secondary max-w-md">
          Configure form behavior, submission settings, and integrations.
        </p>
      </div>
    </div>
  );
}

function FormPreviewPlaceholder() {
  return (
    <div className="h-full w-full bg-kb-bg-primary flex items-center justify-center">
      <div className="text-center">
        <Eye className="w-12 h-12 text-kb-content-tertiary mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-kb-content-primary mb-2">
          Form Preview
        </h2>
        <p className="text-kb-content-secondary max-w-md">
          See how your form will look to users before publishing.
        </p>
      </div>
    </div>
  );
}

function FormAnalyticsPlaceholder() {
  return (
    <div className="h-full w-full bg-kb-bg-primary flex items-center justify-center">
      <div className="text-center">
        <StatUp className="w-12 h-12 text-kb-content-tertiary mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-kb-content-primary mb-2">
          Analytics coming soon
        </h2>
        <p className="text-kb-content-secondary max-w-md">
          Track form views, submissions, and conversion rates.
        </p>
      </div>
    </div>
  );
}
