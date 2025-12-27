import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { BroadcastEditorClient } from "./_components/broadcast-editor-client";

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

export default async function BroadcastEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const workspaceId = session.currentOrganization.id;

  const [broadcast, senderIdentities, domains] = await Promise.all([
    prisma.broadcast.findUnique({
      where: { id },
      include: {
        emailContent: true,
      },
    }),
    getSenderIdentities(workspaceId),
    getDomains(workspaceId),
  ]);

  const initialContent = broadcast?.emailContent?.contentJson as
    | Record<string, unknown>
    | undefined;

  const initialStyles = broadcast?.emailContent?.styles as
    | Record<string, unknown>
    | undefined;

  return (
    <BroadcastEditorClient
      broadcastId={id}
      broadcastName={broadcast?.name ?? "Untitled Broadcast"}
      status={broadcast?.status ?? "DRAFT"}
      initialContent={initialContent}
      initialStyles={initialStyles}
      initialSubject={broadcast?.emailContent?.subject ?? ""}
      initialPreviewText={broadcast?.emailContent?.previewText ?? ""}
      initialSenderIdentityId={broadcast?.senderIdentityId ?? undefined}
      initialTopicId={broadcast?.topicId ?? undefined}
      initialSegmentId={broadcast?.segmentId ?? undefined}
      initialSendAt={broadcast?.sendAt ?? undefined}
      initialTrackClicks={broadcast?.trackClicks ?? undefined}
      initialTrackOpens={broadcast?.trackOpens ?? undefined}
      initialReplyToIdentityId={broadcast?.replyToIdentityId ?? undefined}
      senderIdentities={senderIdentities}
      domains={domains}
    />
  );
}
