import * as Tabs from "@kibamail/owly/tabs";
import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
  DashboardLayoutContentActions,
} from "@kibamail/owly/dashboard-layout";
import { FormsTable } from "./_components/forms-table";
import { CreateFormButton } from "./_components/create-form-button";
import { SearchInput } from "@/app/(dashboard)/w/_components/search-input";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

async function getForms(workspaceId: string) {
  const forms = await prisma.form.findMany({
    where: {
      workspaceId,
      parentId: null, // Only root forms
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
    },
  });

  return forms.map((form) => ({
    ...form,
    submissions: form._count.submissions,
  }));
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
