import "@/app/forms.css";

import type { Spec } from "@json-render/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { FormSettings } from "@/lib/json-render/settings-schema";
import { trackUniqueFormView } from "@/lib/forms/view-tracking";
import { FormPageClient } from "./_components/form-page-client";

interface PublishedFormData {
  id: string;
  name: string;
  spec: Spec | null;
  settings: FormSettings | null;
  workspaceId: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  seoFaviconUrl: string | null;
}

async function getPublishedForm(
  idOrSlug: string,
): Promise<PublishedFormData | null> {
  // Find the root form by ID or slug using optimized OR query
  const rootForm = await prisma.form.findFirst({
    where: {
      parentId: null, // Must be a root form
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    select: {
      id: true,
      name: true,
      fields: true,
      settings: true,
      workspaceId: true,
      publishedVersionId: true,
      seoTitle: true,
      seoDescription: true,
      seoImageUrl: true,
      seoFaviconUrl: true,
    },
  });

  if (!rootForm) {
    return null;
  }

  // If there's a published version, use that for spec/settings
  if (rootForm.publishedVersionId) {
    const publishedVersion = await prisma.form.findFirst({
      where: {
        id: rootForm.publishedVersionId,
      },
      select: {
        fields: true,
        settings: true,
        seoTitle: true,
        seoDescription: true,
        seoImageUrl: true,
        seoFaviconUrl: true,
      },
    });

    if (publishedVersion) {
      return {
        id: rootForm.id,
        name: rootForm.name,
        spec: publishedVersion.fields as unknown as Spec | null,
        settings: publishedVersion.settings as FormSettings | null,
        workspaceId: rootForm.workspaceId,
        // Use published version's SEO if set, otherwise fall back to root
        seoTitle: publishedVersion.seoTitle ?? rootForm.seoTitle,
        seoDescription:
          publishedVersion.seoDescription ?? rootForm.seoDescription,
        seoImageUrl: publishedVersion.seoImageUrl ?? rootForm.seoImageUrl,
        seoFaviconUrl: publishedVersion.seoFaviconUrl ?? rootForm.seoFaviconUrl,
      };
    }
  }

  // Fall back to the root form's spec (for preview before publishing)
  return {
    id: rootForm.id,
    name: rootForm.name,
    spec: rootForm.fields as unknown as Spec | null,
    settings: rootForm.settings as FormSettings | null,
    workspaceId: rootForm.workspaceId,
    seoTitle: rootForm.seoTitle,
    seoDescription: rootForm.seoDescription,
    seoImageUrl: rootForm.seoImageUrl,
    seoFaviconUrl: rootForm.seoFaviconUrl,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const form = await getPublishedForm(id);

  if (!form) {
    return { title: "Form Not Found" };
  }

  const title = form.seoTitle || form.name;
  const description = form.seoDescription || undefined;

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(form.seoImageUrl && {
        images: [{ url: form.seoImageUrl, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: form.seoImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(form.seoImageUrl && { images: [form.seoImageUrl] }),
    },
  };

  if (form.seoFaviconUrl) {
    metadata.icons = { icon: form.seoFaviconUrl };
  }

  return metadata;
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idOrSlug } = await params;

  const form = await getPublishedForm(idOrSlug);

  if (!form) {
    notFound();
  }

  if (!form.spec) {
    notFound();
  }

  // Track unique page view using actual form ID (not slug)
  const { tracked } = await trackUniqueFormView(form.id, form.workspaceId);

  return (
    <FormPageClient
      formId={form.id}
      spec={form.spec}
      settings={form.settings}
      shouldSetViewCookie={tracked}
    />
  );
}
