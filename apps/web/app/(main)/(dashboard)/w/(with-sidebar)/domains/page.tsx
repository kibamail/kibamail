import {
  DashboardLayoutContentActions,
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";

import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

import { CreateDomainButton } from "./_components/create-domain-button";
import { DomainsTable } from "./_components/domains-table";

async function getDomains(workspaceId: string) {
  const domains = await prisma.sendingDomain.findMany({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      dkimVerifiedAt: true,
      returnPathDomainVerifiedAt: true,
      trackingDomainVerifiedAt: true,
      dmarcVerifiedAt: true,
      inboxMxVerifiedAt: true,
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      sslIssuanceStatus: true,
      sslIssuanceError: true,
      createdAt: true,
    },
  });

  return domains;
}

export type DomainListItem = Awaited<ReturnType<typeof getDomains>>[number];

export default async function DomainsPage() {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const domains = await getDomains(session.currentOrganization.id);

  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Sending Domains">
          <DashboardLayoutContentActions>
            <CreateDomainButton />
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="flex w-full flex-col gap-4">
        <DomainsTable domains={domains} />
      </div>
    </div>
  );
}
