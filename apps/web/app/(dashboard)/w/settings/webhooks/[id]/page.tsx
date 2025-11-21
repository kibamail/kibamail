import { getSession } from "@/lib/auth/get-session";
import { outpost } from "@/webhooks/client/client";
import { WebhookActionsDropdown } from "../_components/webhook-actions-dropdown";
import {
  DashboardLayoutStickyDetailHeader,
  DashboardLayoutStickyDetailHeaderDescription,
  DashboardLayoutStickyDetailHeaderIcon,
  DashboardLayoutStickyDetailHeaderTitle,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import { DataTransferBoth } from "iconoir-react";
import { notFound } from "next/navigation";
import { WebhookDetailClient } from "../_components/webhook-detail-client";

interface WebhookDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WebhookDetailPage({
  params,
}: WebhookDetailPageProps) {
  const { id } = await params;
  const ctx = await getSession();

  const tenantId = ctx.currentOrganization?.id as string;

  const destination = await outpost.tenants(tenantId).destinations().get(id);

  if (!destination) {
    notFound();
  }

  return (
    <DashboardLayoutStickyContentHeaderContainer>
      <DashboardLayoutStickyDetailHeader>
        <DashboardLayoutStickyDetailHeaderIcon>
          <DataTransferBoth />
        </DashboardLayoutStickyDetailHeaderIcon>

        <div className="flex items-center">
          <div className="flex flex-col flex-1">
            <DashboardLayoutStickyDetailHeaderDescription className="capitalize">
              {destination.type?.replace(/_/g, " ")}
            </DashboardLayoutStickyDetailHeaderDescription>
            <DashboardLayoutStickyDetailHeaderTitle>
              {(destination.config as { url?: string })?.url}
            </DashboardLayoutStickyDetailHeaderTitle>
          </div>

          <WebhookActionsDropdown destination={destination} variant="default" />
        </div>
      </DashboardLayoutStickyDetailHeader>

      <WebhookDetailClient destination={destination} />
    </DashboardLayoutStickyContentHeaderContainer>
  );
}
