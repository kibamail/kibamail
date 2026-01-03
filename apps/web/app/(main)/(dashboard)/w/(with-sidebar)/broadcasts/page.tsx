import {
  DashboardLayoutContentActions,
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { BroadcastsTable } from "./_components/broadcasts-table";
import { CreateBroadcastButton } from "./_components/create-broadcast-button";

async function getBroadcasts(workspaceId: string) {
  return prisma.broadcast.findMany({
    where: { workspaceId },
    include: {
      emailContent: {
        select: {
          subject: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

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
  const domains = await prisma.sendingDomain.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return domains;
}

export default async function BroadcastsPage() {
  const session = await getSession();
  const workspaceId = session.currentOrganization.id;

  const [broadcasts, senderIdentities, domains] = await Promise.all([
    getBroadcasts(workspaceId),
    getSenderIdentities(workspaceId),
    getDomains(workspaceId),
  ]);

  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Broadcasts">
          <DashboardLayoutContentActions>
            <CreateBroadcastButton
              senderIdentities={senderIdentities}
              domains={domains}
            />
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="py-4">
        <BroadcastsTable broadcasts={broadcasts} />
      </div>
    </div>
  );
}
