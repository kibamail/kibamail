"use client";

import {
  DashboardLayoutContentActions,
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import * as Tabs from "@kibamail/owly/tabs";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { SettingsTabs } from "@/app/(main)/(dashboard)/w/(with-sidebar)/settings/_components/settings-tabs";
import { CreateApiKeyButton } from "@/app/(main)/(dashboard)/w/(with-sidebar)/settings/api-keys/_components/create-api-key-button";
import { CreateWebhookButtonWrapper } from "@/app/(main)/(dashboard)/w/(with-sidebar)/settings/webhooks/_components/create-webhook-button-wrapper";

export function SettingsTabsContainer({ children }: PropsWithChildren) {
  const pathname = usePathname();

  const segments = pathname.split("/");
  const activeTab = segments[segments.length - 1] || "workspace";

  return (
    <Tabs.Root variant="secondary" className="w-full!" value={activeTab}>
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Settings">
          <DashboardLayoutContentActions>
            {activeTab === "api-keys" && <CreateApiKeyButton />}
            {activeTab === "webhooks" && <CreateWebhookButtonWrapper />}
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>

        <SettingsTabs />
      </DashboardLayoutStickyContentHeaderContainer>

      {children}
    </Tabs.Root>
  );
}
