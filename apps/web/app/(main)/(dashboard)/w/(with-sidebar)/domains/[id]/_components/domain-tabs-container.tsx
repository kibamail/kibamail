"use client";

import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutStickyDetailHeader,
  DashboardLayoutStickyDetailHeaderDescription,
  DashboardLayoutStickyDetailHeaderTitle,
} from "@kibamail/owly/dashboard-layout";
import * as Tabs from "@kibamail/owly/tabs";
import { Globe } from "iconoir-react";
import { usePathname } from "next/navigation";
import type { PropsWithChildren, ReactNode } from "react";
import { DomainTabs } from "./domain-tabs";

interface DomainTabsContainerProps extends PropsWithChildren {
  domainId: string;
  domainName: string;
  headerActions?: ReactNode;
}

/**
 * Domain Tabs Container
 *
 * Wraps domain detail pages with tab navigation.
 */
export function DomainTabsContainer({
  domainId,
  domainName,
  headerActions,
  children,
}: DomainTabsContainerProps) {
  const pathname = usePathname();

  // Determine active tab from pathname
  const activeTab = pathname.includes("/senders") ? "senders" : "details";

  return (
    <Tabs.Root variant="secondary" className="w-full!" value={activeTab}>
      <DashboardLayoutStickyContentHeaderContainer className="mt-8">
        <DashboardLayoutStickyDetailHeader>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-lg bg-kb-background-secondary flex items-center justify-center border border-kb-border-tertiary">
              <Globe className="w-7 h-7 text-kb-content-tertiary" />
            </div>

            <div className="flex flex-col flex-1">
              <DashboardLayoutStickyDetailHeaderDescription>
                Sending Domain
              </DashboardLayoutStickyDetailHeaderDescription>
              <DashboardLayoutStickyDetailHeaderTitle>
                {domainName}
              </DashboardLayoutStickyDetailHeaderTitle>
            </div>

            {headerActions && (
              <div className="flex items-center gap-3">{headerActions}</div>
            )}
          </div>
        </DashboardLayoutStickyDetailHeader>

        <DomainTabs domainId={domainId} />
      </DashboardLayoutStickyContentHeaderContainer>

      {children}
    </Tabs.Root>
  );
}
