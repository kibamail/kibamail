import { Text } from "@kibamail/owly";
import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
} from "@kibamail/owly/dashboard-layout";
import * as Tabs from "@kibamail/owly/tabs";

export default function Dashboard() {
  return (
    <Tabs.Root variant="secondary" className="w-full!">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Dashboard"></DashboardLayoutContentHeader>

        <Tabs.List defaultValue={"overview"}>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
      </DashboardLayoutStickyContentHeaderContainer>

      <Tabs.Content value="overview" className="p-4">
        <Text>
          This is the ovewview page of the dashboard. Moment of truth.
        </Text>
      </Tabs.Content>
    </Tabs.Root>
  );
}
