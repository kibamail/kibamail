"use client";

import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import type { FormStatus } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditPencil, Eye, Settings, StatUp, Xmark } from "iconoir-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { internalApi } from "@/lib/api/client";
import { FieldPropertiesPanel } from "./field-properties-panel";
import { FieldsSidebar } from "./fields-sidebar";
import { FormBuilderProvider, useFormBuilder } from "./form-builder-context";
import { FormCanvas } from "./form-canvas";
import { FormLivePreview } from "./form-live-preview";
import { FormSettingsTab } from "./form-settings-tab";
import {
  FormVersionDropdown,
  type FormVersionItem,
} from "./form-version-dropdown";
import type { FormBuilderSchema } from "./types";

type EditorTab = "create" | "settings" | "preview" | "analytics";

const VALID_TABS: EditorTab[] = ["create", "settings", "preview", "analytics"];

export interface FormSeoData {
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  seoFaviconUrl: string | null;
  slug: string | null;
}

interface FormBuilderClientProps {
  formId: string;
  formName: string;
  formStatus: FormStatus;
  formVersion: number;
  rootFormId: string;
  versions: FormVersionItem[];
  isLiveVersion: boolean;
  initialSchema: FormBuilderSchema | null;
  doubleOptInEmailId?: string | null;
  initialSeo?: FormSeoData;
}

interface FormBuilderContentProps {
  formId: string;
  formStatus: FormStatus;
  formVersion: number;
  rootFormId: string;
  versions: FormVersionItem[];
  isLiveVersion: boolean;
}

function FormBuilderContent({
  formId,
  formStatus,
  formVersion,
  rootFormId,
  versions,
  isLiveVersion,
}: FormBuilderContentProps) {
  const { schema, selectedFieldId, formName, seo } = useFormBuilder();
  const queryClient = useQueryClient();
  const isDraft = formStatus === "DRAFT";
  const { success: toast, error: toastError } = useToast();
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      return internalApi.forms().update(formId, {
        name: formName,
        fields: schema,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        seoImageUrl: seo.seoImageUrl,
        seoFaviconUrl: seo.seoFaviconUrl,
        slug: seo.slug,
      });
    },
    onSuccess: () => {
      toast("Form saved successfully");
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
    },
    onError: (error: Error) => {
      toastError(error.message || "Failed to save form");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      return internalApi.forms().publish(formId);
    },
    onSuccess: () => {
      toast("Form published successfully");
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
    },
    onError: (error: Error) => {
      toastError(error.message || "Failed to publish form");
    },
  });

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      {/* Header */}
      <div className="h-[60px] relative w-full flex items-center justify-between px-3 shrink-0">
        {/* Left: close button, name, and version dropdown */}
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href="/w/forms">
              <Xmark className="w-6! h-6!" />
            </Link>
          </Button>

          <h1 className="text-lg font-semibold text-kb-content-primary">
            {formName}
          </h1>

          <FormVersionDropdown
            currentFormId={formId}
            currentVersion={formVersion}
            currentStatus={formStatus}
            rootFormId={rootFormId}
            versions={versions}
            isLiveVersion={isLiveVersion}
          />
        </div>

        {/* Center: tabs */}
        <div className="flex items-center gap-3 absolute left-[50%] translate-x-[-50%]">
          <Button
            className="rounded-full!"
            variant={activeTab === "create" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("create")}
          >
            <EditPencil className="w-4 h-4" />
            Create
          </Button>
          <div className="w-12 h-px bg-kb-border-tertiary"></div>
          <Button
            className="rounded-full!"
            variant={activeTab === "settings" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="w-4 h-4" />
            Settings
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
          {isDraft && (
            <>
              <Button
                variant="secondary"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? "Publishing..." : "Publish"}
              </Button>
            </>
          )}
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
          {isDraft && <FieldsSidebar />}
          <FormCanvas readOnly={!isDraft} />
          {isDraft && selectedFieldId && <FieldPropertiesPanel />}
        </div>

        {/* Settings tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "settings"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <FormSettingsTab />
        </div>

        {/* Preview tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "preview"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <FormLivePreview isActive={activeTab === "preview"} rootFormId={rootFormId} />
        </div>

        {/* Analytics tab */}
        <div
          className={`absolute inset-0 ${
            activeTab === "analytics"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <FormAnalyticsPlaceholder />
        </div>
      </div>
    </div>
  );
}

export function FormBuilderClient({
  formId,
  formName,
  formStatus,
  formVersion,
  rootFormId,
  versions,
  isLiveVersion,
  initialSchema,
  doubleOptInEmailId,
  initialSeo,
}: FormBuilderClientProps) {
  return (
    <FormBuilderProvider
      formId={formId}
      formName={formName}
      initialSchema={initialSchema}
      initialDoubleOptInEmailId={doubleOptInEmailId ?? null}
      initialSeo={initialSeo ?? null}
    >
      <FormBuilderContent
        formId={formId}
        formStatus={formStatus}
        formVersion={formVersion}
        rootFormId={rootFormId}
        versions={versions}
        isLiveVersion={isLiveVersion}
      />
    </FormBuilderProvider>
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
