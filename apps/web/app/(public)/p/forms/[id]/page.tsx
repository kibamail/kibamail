import "@/app/forms.css";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { FormBuilderSchema } from "@/lib/form-builder";
import { FormPageClient } from "./_components/form-page-client";

async function getPublishedForm(formId: string) {
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
      return publishedVersion;
    }
  }

  // Fall back to the root form's schema (for preview before publishing)
  return rootForm;
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

  return <FormPageClient schema={schema} />;
}
