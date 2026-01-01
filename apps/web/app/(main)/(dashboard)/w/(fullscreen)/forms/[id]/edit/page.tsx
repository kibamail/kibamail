import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { FormBuilderClient } from "./_components/form-builder";
import type { FormSchema } from "./_components/form-builder/types";

async function getForm(workspaceId: string, formId: string) {
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    return null;
  }

  return form;
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

  const form = await getForm(session.currentOrganization.id, id);

  if (!form) {
    notFound();
  }

  const initialSchema = form.fields as FormSchema | null;

  return (
    <FormBuilderClient
      formId={form.id}
      formName={form.name}
      initialSchema={initialSchema}
    />
  );
}
