import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { MarketingEmailEditorClient } from "@/components/marketing-email-editor/marketing-email-editor-client";

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

async function getMarketingEmail(workspaceId: string, emailId: string) {
  const [email, senderIdentities, domains] = await Promise.all([
    prisma.email.findFirst({
      where: {
        id: emailId,
        workspaceId,
        type: { not: "TRANSACTIONAL" },
      },
      include: {
        formsAsDoubleOptIn: {
          select: { id: true, name: true },
        },
      },
    }),
    getSenderIdentities(workspaceId),
    getDomains(workspaceId),
  ]);

  if (!email) return null;

  return { email, senderIdentities, domains };
}

export default async function MarketingEmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: emailId } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const result = await getMarketingEmail(
    session.currentOrganization.id,
    emailId,
  );

  if (!result) {
    notFound();
  }

  const { email, senderIdentities, domains } = result;

  return (
    <MarketingEmailEditorClient
      emailId={email.id}
      emailName={email.name}
      emailSubject={email.subject ?? ""}
      emailPreviewText={email.previewText ?? ""}
      initialTrackClicks={email.trackClicks}
      initialTrackOpens={email.trackOpens}
      initialSenderIdentityId={email.senderIdentityId ?? undefined}
      initialReplyToIdentityId={email.replyToIdentityId ?? undefined}
      usedByForms={email.formsAsDoubleOptIn}
      senderIdentities={senderIdentities}
      domains={domains}
    />
  );
}
