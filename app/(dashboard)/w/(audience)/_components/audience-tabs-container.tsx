"use client";

import {
  DashboardLayoutContentActions,
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import * as Tabs from "@kibamail/owly/tabs";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { AudienceTabs } from "./audience-tabs";
import { Button } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";

/**
 * Audience Tabs Container
 *
 * Client component that wraps the audience layout with tabs functionality.
 * Detects the active tab from the current pathname.
 */
export function AudienceTabsContainer({ children }: PropsWithChildren) {
  const pathname = usePathname();

  // Extract the active tab from the pathname - same logic as settings
  const segments = pathname.split("/");
  const activeTab = segments[segments.length - 1] || "contacts";

  return (
    <Tabs.Root variant="secondary" className="w-full!" value={activeTab}>
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Audience">
          <DashboardLayoutContentActions>
            {activeTab === "contacts" && (
              <Button>
                <Plus className="w-4 h-4" />
                Add Contact
              </Button>
            )}
            {activeTab === "segments" && (
              <Button>
                <Plus className="w-4 h-4" />
                Create Segment
              </Button>
            )}
            {activeTab === "topics" && (
              <Button>
                <Plus className="w-4 h-4" />
                Create Topic
              </Button>
            )}
            {activeTab === "properties" && (
              <Button>
                <Plus className="w-4 h-4" />
                Add Property
              </Button>
            )}
          </DashboardLayoutContentActions>
        </DashboardLayoutContentHeader>

        <AudienceTabs />
      </DashboardLayoutStickyContentHeaderContainer>

      {children}
    </Tabs.Root>
  );
}
