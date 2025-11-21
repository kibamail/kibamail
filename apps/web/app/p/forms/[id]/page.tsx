import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicFormRenderer } from "./_components/public-form-renderer";

async function getPublicForm(formId: string) {
  // Find the root form (regardless of its status)
  const rootForm = await prisma.form.findFirst({
    where: {
      id: formId,
      parentId: null, // Must be a root form
      deletedAt: null, // Only show non-deleted forms
    },
  });

  // If no root form found or not published yet, return null
  if (!rootForm || !rootForm.publishedVersionId) {
    return null;
  }

  // Get the currently published version using publishedVersionId
  // This is the source of truth for which version is published
  const publishedForm = await prisma.form.findUnique({
    where: {
      id: rootForm.publishedVersionId,
    },
  });

  return publishedForm;
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await getPublicForm(id);

  if (!form) {
    notFound();
  }

  return <PublicFormRenderer form={form} />;
}
