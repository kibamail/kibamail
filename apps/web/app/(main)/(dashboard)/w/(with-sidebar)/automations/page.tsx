import * as Tabs from "@kibamail/owly/tabs";
import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
  DashboardLayoutContentActions,
} from "@kibamail/owly/dashboard-layout";
import { AutomationsTable } from "./_components/automations-table";
import { CreateAutomationButton } from "./_components/create-automation-button";
import { SearchInput } from "@/app/(main)/(dashboard)/w/(with-sidebar)/_components/search-input";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AutomationsPage() {
  const session = await getSession();

  if (!session?.currentOrganization) {
    redirect("/w");
  }

  // Fetch root automations (parentId: null) with all their versions
  const rootAutomations = await prisma.automation.findMany({
    where: {
      workspaceId: session.currentOrganization.id,
      parentId: null,
      deletedAt: null,
    },
    include: {
      versions: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          version: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform to include all versions (root + children) and find representative
  const automationsWithVersions = rootAutomations.map((root) => {
    // All versions: the root itself + all child versions
    const allVersions = [root, ...root.versions].sort(
      (a, b) => b.version - a.version
    );

    // Find published version (could be root or a child)
    const publishedVersion = allVersions.find((v) => v.status === "PUBLISHED");

    return {
      ...root,
      publishedVersion: publishedVersion || null,
      allVersions,
    };
  });

  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Automations">
          <DashboardLayoutContentActions>
            <CreateAutomationButton />
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="flex w-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <SearchInput placeholder="Search automations" />

          <Tabs.Root defaultValue="all">
            <Tabs.List>
              <Tabs.Trigger value="all">All</Tabs.Trigger>
              <Tabs.Trigger value="draft">Draft</Tabs.Trigger>
              <Tabs.Trigger value="published">Published</Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>
          </Tabs.Root>
        </div>
        <AutomationsTable automations={automationsWithVersions} />
      </div>
    </div>
  );
}
