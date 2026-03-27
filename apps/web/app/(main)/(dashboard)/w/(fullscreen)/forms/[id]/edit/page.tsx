import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { FormEditorClient } from "@/components/form-editor/form-editor-client";
import type { FormContent, FormEditorData } from "@/components/form-editor/types";

async function getFormData(
  workspaceId: string,
  formId: string,
): Promise<FormEditorData | null> {
  const form = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
    select: {
      id: true,
      name: true,
      status: true,
      description: true,
      type: true,
      display: true,
      fields: true,
      fieldMapping: true,
      settings: true,
      seoTitle: true,
      seoDescription: true,
      seoImageUrl: true,
      seoFaviconUrl: true,
      slug: true,
    },
  });

  if (!form) return null;

  const content = form.fields as FormContent | null;

  return {
    id: form.id,
    name: form.name,
    status: form.status,
    description: form.description,
    type: form.type,
    display: form.display,
    fieldMapping: form.fieldMapping as Record<string, unknown> | null,
    settings: form.settings as Record<string, unknown> | null,
    content,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    seoImageUrl: form.seoImageUrl,
    seoFaviconUrl: form.seoFaviconUrl,
    slug: form.slug,
  };
}

export default async function FormEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const form = await getFormData(session.currentOrganization.id, id);

  if (!form) {
    notFound();
  }

  return <FormEditorClient form={form} />;
}
