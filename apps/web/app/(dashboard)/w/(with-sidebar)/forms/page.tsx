import * as Tabs from "@kibamail/owly/tabs";
import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
  DashboardLayoutContentActions,
} from "@kibamail/owly/dashboard-layout";
import { FormsTable } from "./_components/forms-table";
import { CreateFormButton } from "./_components/create-form-button";
import { SearchInput } from "@/app/(dashboard)/w/(with-sidebar)/_components/search-input";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

async function getForms(workspaceId: string) {
  const forms = await prisma.form.findMany({
    where: {
      workspaceId,
      parentId: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          submissions: true,
        },
      },
      publishedVersion: true,
      versions: {
        where: { status: "DRAFT" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return forms.map((form) => {
    const published = form.publishedVersion;
    const draft = form.versions[0];

    // Display the published version details, or fall back to root
    const display = published ?? form;

    // Determine status: published > draft > archived
    const effectiveStatus = published
      ? "PUBLISHED"
      : form.status === "DRAFT" || draft
        ? "DRAFT"
        : "ARCHIVED";

    return {
      id: form.id,
      name: display.name,
      description: display.description,
      status: form.status,
      effectiveStatus,
      submissions: form._count.submissions,
      draftVersionId: draft?.id,
    };
  });
}

export default async function FormsPage() {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const forms = await getForms(session.currentOrganization.id);

  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Forms">
          <DashboardLayoutContentActions>
            <CreateFormButton />
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <SearchInput placeholder="Search forms" />

          <Tabs.Root defaultValue="all">
            <Tabs.List>
              <Tabs.Trigger value="all">All</Tabs.Trigger>
              <Tabs.Trigger value="draft">Draft</Tabs.Trigger>
              <Tabs.Trigger value="live">Live</Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>
          </Tabs.Root>
        </div>
        <FormsTable forms={forms} />
      </div>
    </div>
  );
}
