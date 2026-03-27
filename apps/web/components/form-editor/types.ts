import type { FormStatus } from "@prisma/client";

export type FormEditorTab = "upload" | "details" | "preview" | "analytics";

export interface FormTabConfig {
  id: FormEditorTab;
  label: string;
  enabled: boolean;
}

export function getFormTabs(status: FormStatus): FormTabConfig[] {
  const tabs: FormTabConfig[] = [
    { id: "upload", label: "Upload form", enabled: true },
    { id: "details", label: "Details", enabled: true },
    { id: "preview", label: "Preview", enabled: true },
    { id: "analytics", label: "Analytics", enabled: true },
  ];
  return tabs.filter((tab) => tab.enabled);
}

export interface FormContent {
  html: string;
  deployId: string;
  files: Array<{ name: string; url: string; size: number; type: string }>;
}

export interface FormEditorData {
  id: string;
  name: string;
  status: FormStatus;
  description: string | null;
  type: string;
  display: string;
  fieldMapping: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  content: FormContent | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  seoFaviconUrl: string | null;
  slug: string | null;
}
