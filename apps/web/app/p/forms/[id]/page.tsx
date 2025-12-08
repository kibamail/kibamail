import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicFormRenderer } from "./_components/public-form-renderer";
import { QueryProvider } from "@/lib/providers/query-provider";

async function getPublicForm(formId: string) {
  const rootForm = await prisma.form.findFirst({
    where: {
      id: formId,
      parentId: null,
      deletedAt: null,
    },
  });

  if (!rootForm || !rootForm.publishedVersionId) {
    return null;
  }

  const publishedForm = await prisma.form.findUnique({
    where: {
      id: rootForm.publishedVersionId,
    },
  });

  if (!publishedForm) {
    return null;
  }

  return {
    rootFormId: rootForm.id,
    publishedForm,
  };
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPublicForm(id);

  if (!result) {
    notFound();
  }

  return (
    <QueryProvider>
      <PublicFormRenderer
        form={result.publishedForm}
        formId={result.rootFormId}
      />
    </QueryProvider>
  );
}
