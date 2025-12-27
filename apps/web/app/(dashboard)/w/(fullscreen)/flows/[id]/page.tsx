import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { FlowEditorClient } from "./_components/flow-editor-client";
import type { Automation, Prisma } from "@prisma/client";

interface FlowPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

function formatAutomation(automation: Automation) {
  return {
    object: "automation" as const,
    id: automation.id,
    name: automation.name,
    description: automation.description,
    status: automation.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    version: automation.version,
    parentId: automation.parentId,
    trigger: {
      type: automation.triggerType,
      config: (automation.triggerConfig || {}) as Record<string, unknown>,
    },
    nodes: automation.nodes as unknown[],
    edges: automation.edges as unknown[],
    stats: (automation.stats || {}) as Record<string, unknown>,
    publishedAt: automation.publishedAt,
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
  };
}

export default async function FlowPage({ params, searchParams }: FlowPageProps) {
  const { id } = await params;
  const { version: versionParam } = await searchParams;
  const session = await getSession();

  if (!session?.currentOrganization) {
    notFound();
  }

  const workspaceId = session.currentOrganization.id;

  const requestedAutomation = await prisma.automation.findFirst({
    where: {
      id,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!requestedAutomation) {
    notFound();
  }

  const rootId = requestedAutomation.parentId || requestedAutomation.id;

  const rootAutomation = await prisma.automation.findFirst({
    where: {
      id: rootId,
      workspaceId,
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
  });

  if (!rootAutomation) {
    notFound();
  }

  const allVersions = [rootAutomation, ...rootAutomation.versions].sort(
    (a, b) => b.version - a.version
  );

  let selectedVersion: Automation | undefined;

  if (versionParam) {
    const requestedVersion = parseInt(versionParam, 10);
    selectedVersion = allVersions.find((v) => v.version === requestedVersion);

    if (!selectedVersion) {
      redirect(`/w/flows/${rootId}`);
    }
  } else {
    const latestDraft = allVersions.find((v) => v.status === "DRAFT");

    if (latestDraft) {
      selectedVersion = latestDraft;
    } else {
      const publishedVersion = allVersions.find((v) => v.status === "PUBLISHED");
      const sourceVersion = publishedVersion || allVersions[0];

      const maxVersion = Math.max(...allVersions.map((v) => v.version));
      const newVersionNumber = maxVersion + 1;

      await prisma.automation.create({
        data: {
          workspaceId,
          name: rootAutomation.name,
          description: rootAutomation.description,
          status: "DRAFT",
          version: newVersionNumber,
          parentId: rootId,
          triggerType: sourceVersion.triggerType,
          triggerConfig: (sourceVersion.triggerConfig as Prisma.JsonObject) || {},
          nodes: sourceVersion.nodes as Prisma.JsonArray,
          edges: sourceVersion.edges as Prisma.JsonArray,
          settings: (sourceVersion.settings as Prisma.JsonObject) || {},
          stats: {},
        },
      });

      redirect(`/w/flows/${rootId}`);
    }
  }

  const formattedAllVersions = allVersions.map(formatAutomation);
  const formattedSelectedVersion = formatAutomation(selectedVersion);

  return (
    <FlowEditorClient
      key={formattedSelectedVersion.id}
      automation={formattedSelectedVersion}
      allVersions={formattedAllVersions}
      rootId={rootId}
    />
  );
}
