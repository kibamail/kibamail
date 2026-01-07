import { notFound } from "next/navigation";
import type { PropsWithChildren } from "react";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { DomainLayoutClient } from "./_components/domain-layout-client";

interface DomainLayoutProps extends PropsWithChildren {
  params: Promise<{ id: string }>;
}

export default async function DomainLayout({
  params,
  children,
}: DomainLayoutProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const workspaceId = session.currentOrganization.id;

  const domain = await prisma.sendingDomain.findFirst({
    where: {
      id,
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      dkimVerifiedAt: true,
      returnPathDomainVerifiedAt: true,
      trackingDomainVerifiedAt: true,
    },
  });

  if (!domain) {
    notFound();
  }

  const isFullyVerified =
    domain.dkimVerifiedAt !== null &&
    domain.returnPathDomainVerifiedAt !== null &&
    domain.trackingDomainVerifiedAt !== null;

  return (
    <DomainLayoutClient
      domainId={domain.id}
      domainName={domain.name}
      isFullyVerified={isFullyVerified}
    >
      {children}
    </DomainLayoutClient>
  );
}
