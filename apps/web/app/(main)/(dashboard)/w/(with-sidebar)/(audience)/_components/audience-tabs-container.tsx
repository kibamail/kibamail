"use client";

import {
  DashboardLayoutContentActions,
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import * as Tabs from "@kibamail/owly/tabs";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { AudienceTabs } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/_components/audience-tabs";
import { CreateContactButton } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/create-contact-button";
import { CreateContactPropertyButton } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/create-contact-property-button";
import { ImportContactsButton } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts";
import { CreateSegmentButton } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/segments/_components/create-segment-button";
import { CreateTopicButton } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/topics/_components/create-topic-button";

export function AudienceTabsContainer({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const activeTab = segments[segments.length - 1] || "contacts";

  return (
    <Tabs.Root variant="secondary" className="w-full!" value={activeTab}>
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Audience">
          <DashboardLayoutContentActions>
            {activeTab === "contacts" && (
              <>
                <ImportContactsButton />
                <CreateContactButton />
              </>
            )}
            {activeTab === "topics" && <CreateTopicButton />}
            {activeTab === "segments" && <CreateSegmentButton />}
            {activeTab === "properties" && <CreateContactPropertyButton />}
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>

        <AudienceTabs />
      </DashboardLayoutStickyContentHeaderContainer>

      {children}
    </Tabs.Root>
  );
}
