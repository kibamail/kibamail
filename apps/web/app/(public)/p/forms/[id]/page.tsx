import "@/app/forms.css";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { FormBuilderSchema } from "@/lib/form-builder";
import { FormPageClient } from "./_components/form-page-client";
import { trackUniqueFormView } from "@/lib/forms/view-tracking";

interface PublishedFormData {
  fields: unknown;
  settings: unknown;
  workspaceId: string;
}

async function getPublishedForm(formId: string): Promise<PublishedFormData | null> {
  // First, get the root form
  const rootForm = await prisma.form.findFirst({
    where: {
      id: formId,
      parentId: null, // Must be a root form
    },
    select: {
      id: true,
      fields: true,
      settings: true,
      workspaceId: true,
      publishedVersionId: true,
    },
  });

  if (!rootForm) {
    return null;
  }

  // If there's a published version, use that
  if (rootForm.publishedVersionId) {
    const publishedVersion = await prisma.form.findFirst({
      where: {
        id: rootForm.publishedVersionId,
      },
      select: {
        fields: true,
        settings: true,
      },
    });

    if (publishedVersion) {
      return {
        fields: publishedVersion.fields,
        settings: publishedVersion.settings,
        workspaceId: rootForm.workspaceId,
      };
    }
  }

  // Fall back to the root form's schema (for preview before publishing)
  return {
    fields: rootForm.fields,
    settings: rootForm.settings,
    workspaceId: rootForm.workspaceId,
  };
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const form = await getPublishedForm(id);

  if (!form) {
    notFound();
  }

  const schema = form.fields as FormBuilderSchema | null;

  if (!schema) {
    notFound();
  }

  // Track unique page view (server-side creates record, client sets cookie)
  const { tracked } = await trackUniqueFormView(id, form.workspaceId);

  return <FormPageClient formId={id} schema={schema} shouldSetViewCookie={tracked} />;
}
