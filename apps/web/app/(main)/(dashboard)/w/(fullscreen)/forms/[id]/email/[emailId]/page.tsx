import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { DoubleOptInEmailEditorClient } from "./_components/double-opt-in-email-editor-client";

async function getSenderIdentities(workspaceId: string) {
  const identities = await prisma.senderIdentity.findMany({
    where: { workspaceId },
    include: {
      sendingDomain: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return identities.map((identity) => ({
    id: identity.id,
    name: identity.name,
    email: `${identity.email}@${identity.sendingDomain.name}`,
    localPart: identity.email,
    domain: identity.sendingDomain.name,
    domainId: identity.sendingDomain.id,
    verified: identity.emailVerifiedAt !== null,
  }));
}

async function getDomains(workspaceId: string) {
  return prisma.sendingDomain.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}

async function getEmailAndForm(
  workspaceId: string,
  formId: string,
  emailId: string,
) {
  const [form, email, senderIdentities, domains] = await Promise.all([
    prisma.form.findFirst({
      where: {
        id: formId,
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        doubleOptInEmailId: true,
      },
    }),
    prisma.email.findFirst({
      where: {
        id: emailId,
        workspaceId,
      },
    }),
    getSenderIdentities(workspaceId),
    getDomains(workspaceId),
  ]);

  return {
    form,
    email,
    senderIdentities,
    domains,
  };
}

export default async function DoubleOptInEmailPage({
  params,
}: {
  params: Promise<{ id: string; emailId: string }>;
}) {
  const { id: formId, emailId } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const { form, email, senderIdentities, domains } = await getEmailAndForm(
    session.currentOrganization.id,
    formId,
    emailId,
  );

  if (!form || !email) {
    notFound();
  }

  // Verify the email belongs to this form
  if (form.doubleOptInEmailId !== email.id) {
    notFound();
  }

  return (
    <DoubleOptInEmailEditorClient
      formId={form.id}
      formName={form.name}
      emailId={email.id}
      emailName={email.name}
      initialContent={email.content as Record<string, unknown> | undefined}
      initialStyles={email.styles as Record<string, unknown> | undefined}
      initialSubject={email.subject ?? ""}
      initialPreviewText={email.previewText ?? ""}
      initialSenderIdentityId={email.senderIdentityId ?? undefined}
      initialReplyToIdentityId={email.replyToIdentityId ?? undefined}
      initialTrackClicks={email.trackClicks}
      initialTrackOpens={email.trackOpens}
      senderIdentities={senderIdentities}
      domains={domains}
    />
  );
}
