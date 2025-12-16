import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
  DashboardLayoutContentActions,
} from "@kibamail/owly/dashboard-layout";
import { BroadcastsTable } from "./_components/broadcasts-table";
import { CreateBroadcastButton } from "./_components/create-broadcast-button";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";

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

export default async function BroadcastsPage() {
  const session = await getSession();
  const broadcasts = await getBroadcasts(session.currentOrganization.id);

  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Broadcasts">
          <DashboardLayoutContentActions>
            <CreateBroadcastButton />
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="py-4">
        <BroadcastsTable broadcasts={broadcasts} />
      </div>
    </div>
  );
}
