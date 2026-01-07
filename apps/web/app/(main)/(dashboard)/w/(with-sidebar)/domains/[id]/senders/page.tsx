import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { SenderIdentitiesTable } from "./_components/sender-identities-table";

interface DomainSenderIdentitiesPageProps {
  params: Promise<{ id: string }>;
}

export default async function DomainSenderIdentitiesPage({
  params,
}: DomainSenderIdentitiesPageProps) {
  const { id: domainId } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const workspaceId = session.currentOrganization.id;

  // Verify domain exists and belongs to workspace
  const domain = await prisma.sendingDomain.findFirst({
    where: {
      id: domainId,
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      dkimVerifiedAt: true,
    },
  });

  if (!domain) {
    notFound();
  }

  // Fetch sender identities for this domain
  const senderIdentities = await prisma.senderIdentity.findMany({
    where: {
      sendingDomainId: domainId,
      workspaceId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      replyToEmail: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  // Transform sender identities for the table
  const transformedIdentities = senderIdentities.map((identity) => ({
    id: identity.id,
    name: identity.name,
    email: `${identity.email}@${domain.name}`,
    localPart: identity.email,
    domain: domain.name,
    domainId: domain.id,
    replyToEmail: identity.replyToEmail,
    verified: identity.emailVerifiedAt !== null,
    createdAt: identity.createdAt.toISOString(),
  }));

  return (
    <div className="py-6">
      <SenderIdentitiesTable
        senderIdentities={transformedIdentities}
        domainId={domain.id}
        domainName={domain.name}
        domainVerified={domain.dkimVerifiedAt !== null}
      />
    </div>
  );
}
