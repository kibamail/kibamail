import type { FormStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { FormBuilderClient } from "./_components/form-builder";
import type { FormBuilderSchema } from "./_components/form-builder/types";

export interface FormVersion {
  id: string;
  version: number;
  status: FormStatus;
  publishedAt: Date | null;
  createdAt: Date;
}

interface FormSeoData {
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  seoFaviconUrl: string | null;
  slug: string | null;
}

interface FormWithVersions {
  id: string;
  name: string;
  fields: unknown;
  status: FormStatus;
  version: number;
  parentId: string | null;
  publishedVersionId: string | null;
  doubleOptInEmailId: string | null;
  rootFormId: string;
  versions: FormVersion[];
  isLiveVersion: boolean;
  seo: FormSeoData;
}

async function getFormWithVersions(
  workspaceId: string,
  formId: string,
): Promise<FormWithVersions | null> {
  // First, get the requested form
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      fields: true,
      status: true,
      version: true,
      parentId: true,
      publishedVersionId: true,
      doubleOptInEmailId: true,
      publishedAt: true,
      createdAt: true,
      seoTitle: true,
      seoDescription: true,
      seoImageUrl: true,
      seoFaviconUrl: true,
      slug: true,
    },
  });

  if (!form) {
    return null;
  }

  // Determine the root form ID (either this form or its parent)
  const rootFormId = form.parentId ?? form.id;

  // Get root form to check publishedVersionId
  const rootForm = form.parentId
    ? await prisma.form.findFirst({
        where: { id: form.parentId, workspaceId },
        select: { publishedVersionId: true },
      })
    : form;

  // Fetch all versions (root form + all children)
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

  // Determine if current form is the live version
  const isLiveVersion = rootForm?.publishedVersionId === form.id;

  return {
    id: form.id,
    name: form.name,
    fields: form.fields,
    status: form.status,
    version: form.version,
    parentId: form.parentId,
    publishedVersionId: form.publishedVersionId,
    doubleOptInEmailId: form.doubleOptInEmailId,
    rootFormId,
    versions: allVersions,
    isLiveVersion,
    seo: {
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      seoImageUrl: form.seoImageUrl,
      seoFaviconUrl: form.seoFaviconUrl,
      slug: form.slug,
    },
  };
}

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const form = await getFormWithVersions(session.currentOrganization.id, id);

  if (!form) {
    notFound();
  }

  const initialSchema = form.fields as FormBuilderSchema | null;

  return (
    <FormBuilderClient
      formId={form.id}
      formName={form.name}
      formStatus={form.status}
      formVersion={form.version}
      rootFormId={form.rootFormId}
      versions={form.versions}
      isLiveVersion={form.isLiveVersion}
      initialSchema={initialSchema}
      doubleOptInEmailId={form.doubleOptInEmailId}
      initialSeo={form.seo}
    />
  );
}
