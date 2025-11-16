import { Button } from "@kibamail/owly/button";
import * as Tabs from "@kibamail/owly/tabs";
import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
  DashboardLayoutContentActions,
} from "@kibamail/owly/dashboard-layout";
import { Plus } from "iconoir-react";
import { FormsTable } from "./_components/forms-table";
import { SearchInput } from "@/app/(dashboard)/w/_components/search-input";

export default function FormsPage() {
  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Forms">
          <DashboardLayoutContentActions>
            <Button>
              <Plus className="w-4 h-4" />
              Create Form
            </Button>
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="flex w-full flex-col gap-4 p-4">
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
        <FormsTable />
      </div>
    </div>
  );
}
