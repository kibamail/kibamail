import {
  DashboardLayoutContentActions,
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import * as Tabs from "@kibamail/owly/tabs";
import { SearchInput } from "@/app/(main)/(dashboard)/w/(with-sidebar)/_components/search-input";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { CreateTemplateButton } from "./_components/create-template-button";
import { TemplatesTable } from "./_components/templates-table";

async function getTemplates(workspaceId: string) {
  // Get all root templates
  const rootTemplates = await prisma.emailTemplate.findMany({
    where: {
      workspaceId,
      parentId: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // For each root, get all versions to determine status and link target
  const templatesWithVersionInfo = await Promise.all(
    rootTemplates.map(async (root) => {
      // Get all versions (root + children)
      const allVersions = await prisma.emailTemplate.findMany({
        where: {
          workspaceId,
          OR: [{ id: root.id }, { parentId: root.id }],
        },
        select: {
          id: true,
          status: true,
          version: true,
        },
        orderBy: { version: "desc" },
      });

      // Find draft version (prefer highest version number)
      const draftVersion = allVersions.find((v) => v.status === "DRAFT");

      // Find live/published version (from root's publishedVersionId or status)
      const liveVersionId = root.publishedVersionId;
      const liveVersion = liveVersionId
        ? allVersions.find((v) => v.id === liveVersionId)
        : null;

      // Determine display status: Live if there's a published version, else Draft, else Archived
      let displayStatus: "LIVE" | "DRAFT" | "ARCHIVED";
      if (liveVersion) {
        displayStatus = "LIVE";
      } else if (draftVersion) {
        displayStatus = "DRAFT";
      } else {
        displayStatus = "ARCHIVED";
      }

      // Determine link target: Draft first, then Live, then any version
      const linkTargetId =
        draftVersion?.id ?? liveVersion?.id ?? allVersions[0]?.id ?? root.id;

      // Get the highest version number for display
      const latestVersion = Math.max(...allVersions.map((v) => v.version));

      return {
        id: root.id,
        name: root.name,
        description: root.description,
        displayStatus,
        latestVersion,
        linkTargetId,
        hasDraft: !!draftVersion,
        hasLive: !!liveVersion,
        createdAt: root.createdAt.toISOString(),
        updatedAt: root.updatedAt.toISOString(),
      };
    }),
  );

  return templatesWithVersionInfo;
}

export default async function TemplatesPage() {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const templates = await getTemplates(session.currentOrganization.id);

  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Templates">
          <DashboardLayoutContentActions>
            <CreateTemplateButton />
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <SearchInput placeholder="Search templates" />

          <Tabs.Root defaultValue="all">
            <Tabs.List>
              <Tabs.Trigger value="all">All</Tabs.Trigger>
              <Tabs.Trigger value="draft">Draft</Tabs.Trigger>
              <Tabs.Trigger value="published">Published</Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>
          </Tabs.Root>
        </div>
        <TemplatesTable templates={templates} />
      </div>
    </div>
  );
}
