import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

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

  const form = await prisma.form.findFirst({
    where: {
      id,
      workspaceId: session.currentOrganization.id,
    },
    select: { id: true },
  });

  if (!form) {
    notFound();
  }

  // Forms are managed via API. Redirect to the forms list.
  redirect("/w/forms");
}
