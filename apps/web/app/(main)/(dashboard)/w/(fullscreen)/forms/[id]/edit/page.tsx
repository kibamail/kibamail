import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { FormEditorClient } from "@/components/form-editor/form-editor-client";
import type { FormContent, FormEditorData } from "@/components/form-editor/types";
import type { VersionItem } from "@/components/version-dropdown";

async function getFormData(
  workspaceId: string,
  formId: string,
): Promise<{
  form: FormEditorData;
  version: number;
  rootFormId: string;
  versions: VersionItem[];
  isLiveVersion: boolean;
} | null> {
  const form = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
    select: {
      id: true,
      name: true,
      status: true,
      description: true,
      type: true,
      display: true,
      version: true,
      parentId: true,
      publishedVersionId: true,
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

  const rootFormId = form.parentId ?? form.id;

  const rootForm = form.parentId
    ? await prisma.form.findFirst({
        where: { id: form.parentId, workspaceId },
        select: { publishedVersionId: true },
      })
    : form;

  const allVersions = await prisma.form.findMany({
    where: {
      workspaceId,
      OR: [{ id: rootFormId }, { parentId: rootFormId }],
    },
    select: {
      id: true,
      version: true,
      status: true,
      publishedAt: true,
      createdAt: true,
    },
    orderBy: { version: "desc" },
  });

  const isLiveVersion = rootForm?.publishedVersionId === form.id;

  const content = form.fields as FormContent | null;

  return {
    form: {
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
    },
    version: form.version,
    rootFormId,
    versions: allVersions as VersionItem[],
    isLiveVersion,
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

  const result = await getFormData(session.currentOrganization.id, id);

  if (!result) {
    notFound();
  }

  return (
    <FormEditorClient
      form={result.form}
      version={result.version}
      rootFormId={result.rootFormId}
      versions={result.versions}
      isLiveVersion={result.isLiveVersion}
    />
  );
}
