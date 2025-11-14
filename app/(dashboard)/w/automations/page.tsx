import { Button } from "@kibamail/owly/button";
import * as Tabs from "@kibamail/owly/tabs";
import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
  DashboardLayoutContentActions,
} from "@kibamail/owly/dashboard-layout";
import { Plus } from "iconoir-react";
import { AutomationsTable } from "./_components/automations-table";
import { SearchInput } from "@/app/(dashboard)/w/_components/search-input";

export default function AutomationsPage() {
  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Automations">
          <DashboardLayoutContentActions>
            <Button>
              <Plus className="w-4 h-4" />
              Create Automation
            </Button>
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
              <Tabs.Trigger value="active">Pending</Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>
          </Tabs.Root>
        </div>
        <AutomationsTable />
      </div>
    </div>
  );
}
