"use client";

import { Button } from "@kibamail/owly/button";
import { Badge } from "@kibamail/owly/badge";
import { useToast } from "@kibamail/owly/toast";
import * as Tooltip from "@kibamail/owly/tooltip";
import { useMutation } from "@tanstack/react-query";
import { Xmark } from "iconoir-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { internalApi } from "@/lib/api/client";
import {
  type FormEditorTab,
  type FormEditorData,
  type FormContent,
  getFormTabs,
} from "./types";
import { UploadTab } from "./upload-tab";
import { DetailsTab } from "./details-tab";
import { PreviewTab } from "./preview-tab";
import { AnalyticsTab } from "./analytics-tab";

interface FormEditorClientProps {
  form: FormEditorData;
}

export function FormEditorClient({ form }: FormEditorClientProps) {
  const isReadonly = form.status !== "DRAFT";
  const tabs = getFormTabs(form.status);
  const validTabs = tabs.map((t) => t.id);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { success: toast } = useToast();

  const defaultTab: FormEditorTab = isReadonly ? "details" : "upload";
  const tabParam = searchParams.get("tab");
  const activeTab: FormEditorTab = validTabs.includes(
    tabParam as FormEditorTab,
  )
    ? (tabParam as FormEditorTab)
    : defaultTab;

  const content = form.content;

  function setActiveTab(tab: FormEditorTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!tabParam || !validTabs.includes(tabParam as FormEditorTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", defaultTab);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [tabParam, defaultTab, validTabs, searchParams, router]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      await internalApi.forms().publish(form.id);
    },
    onSuccess: () => {
      toast("Form published successfully");
      router.refresh();
    },
  });

  const statusBadgeVariant =
    form.status === "PUBLISHED"
      ? "success"
      : form.status === "ARCHIVED"
        ? "warning"
        : "info";

  return (
    <div className="flex h-screen w-full flex-col bg-kb-bg-layout px-2 pb-2">
      {/* Header */}
      <div className="relative flex h-[60px] w-full shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href="/w/forms">
              <Xmark className="h-6! w-6!" />
            </Link>
          </Button>

          <h1 className="text-lg font-semibold text-kb-content-primary">
            {form.name}
          </h1>

          <Badge size="sm" variant={statusBadgeVariant}>{form.status}</Badge>
        </div>

        {/* Tab Navigation */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
          {tabs.map((tab, index) => (
            <div key={tab.id} className="flex items-center gap-3">
              {index > 0 && (
                <div className="h-px w-12 bg-kb-border-tertiary" />
              )}
              <Button
                className="rounded-full!"
                variant={activeTab === tab.id ? "secondary" : "tertiary"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {!isReadonly && (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span>
                    <Button
                      onClick={() => publishMutation.mutate()}
                      disabled={
                        !content || publishMutation.isPending
                      }
                      loading={publishMutation.isPending}
                    >
                      {publishMutation.isPending
                        ? "Publishing..."
                        : "Publish"}
                    </Button>
                  </span>
                </Tooltip.Trigger>
                {!content && (
                  <Tooltip.Content side="bottom" sideOffset={8}>
                    Deploy your form files before publishing
                  </Tooltip.Content>
                )}
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative grow overflow-hidden rounded-lg border border-kb-border-tertiary">
        {/* Upload Tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "upload"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <UploadTab
            formId={form.id}
            content={content}
            readonly={isReadonly}
            onDeployed={() => router.refresh()}
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
          <DetailsTab
            formId={form.id}
            readonly={isReadonly}
            seoTitle={form.seoTitle}
            seoDescription={form.seoDescription}
            seoImageUrl={form.seoImageUrl}
            seoFaviconUrl={form.seoFaviconUrl}
            slug={form.slug}
            settings={form.settings}
            fieldMapping={form.fieldMapping}
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
          <PreviewTab
            formId={form.id}
            content={content}
            isActive={activeTab === "preview"}
          />
        </div>

        {/* Analytics Tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "analytics"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <AnalyticsTab
            formId={form.id}
            isActive={activeTab === "analytics"}
          />
        </div>
      </div>
    </div>
  );
}
