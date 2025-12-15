import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutContentHeader,
  DashboardLayoutContentActions,
} from "@kibamail/owly/dashboard-layout";
import { BroadcastsTable } from "./_components/broadcasts-table";
import { CreateBroadcastButton } from "./_components/create-broadcast-button";

export default function BroadcastsPage() {
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
        <BroadcastsTable />
      </div>
    </div>
  );
}
