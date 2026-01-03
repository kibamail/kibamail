import * as CommandSearch from "@kibamail/owly/command-search";
import {
  DashboardLayoutContent,
  DashboardLayoutContentShell,
  DashboardLayoutFooterNotes,
  DashboardLayoutFooterNotesLink,
  DashboardLayoutFooterNotesLinkGroup,
  DashboardLayoutRoot,
  DashboardLayoutSidebar,
  DashboardLayoutSidebarDropdown,
  DashboardLayoutSidebarFooter,
} from "@kibamail/owly/dashboard-layout";
import {
  BookStack,
  HomeAltSlimHoriz,
  NetworkReverse,
  Plus,
  SecureWindow,
  SwipeLeftGesture,
  User,
} from "iconoir-react";
import type { PropsWithChildren } from "react";
import { getSession } from "@/lib/auth/get-session";
import { UserSessionDropdown } from "./_components/profile/user-dropdown";
import { SidebarNavigation } from "./_components/sidebar-navigation";

export default async function DashboardSidebarLayout({
  children,
}: PropsWithChildren) {
  const session = await getSession();

  return (
    <DashboardLayoutRoot>
      <DashboardLayoutSidebarDropdown>
        <UserSessionDropdown session={session} />
      </DashboardLayoutSidebarDropdown>
      <DashboardLayoutSidebar>
        <UserSessionDropdown session={session} />
        <CommandSearch.Root>
          <CommandSearch.Trigger placeholder="Search" />
          <CommandSearch.Content>
            <CommandSearch.Input placeholder="Search..." />
            <CommandSearch.List>
              <CommandSearch.Empty>No results found.</CommandSearch.Empty>
              <CommandSearch.Group heading="Pages">
                <CommandSearch.Item>
                  <BookStack />
                  Getting started
                </CommandSearch.Item>
                <CommandSearch.Item>
                  <HomeAltSlimHoriz />
                  Dashboard
                </CommandSearch.Item>
                <CommandSearch.Item>
                  <User />
                  Audience
                </CommandSearch.Item>
                <CommandSearch.Item>
                  <NetworkReverse />
                  Automations
                </CommandSearch.Item>
                <CommandSearch.Item>
                  <SwipeLeftGesture />
                  Send
                </CommandSearch.Item>
                <CommandSearch.Item>
                  <SecureWindow />
                  Settings
                </CommandSearch.Item>
              </CommandSearch.Group>
              <CommandSearch.Group heading="Actions">
                <CommandSearch.Item>
                  <Plus />
                  Add broadcast
                </CommandSearch.Item>
                <CommandSearch.Item>
                  <Plus />
                  Add contact
                </CommandSearch.Item>
                <CommandSearch.Item>
                  <Plus />
                  Add segment
                </CommandSearch.Item>
              </CommandSearch.Group>
            </CommandSearch.List>
            <CommandSearch.Footer />
          </CommandSearch.Content>
        </CommandSearch.Root>

        <SidebarNavigation />

        <DashboardLayoutSidebarFooter>
          <DashboardLayoutFooterNotes>
            <DashboardLayoutFooterNotesLinkGroup>
              <DashboardLayoutFooterNotesLink>
                Give feedback
              </DashboardLayoutFooterNotesLink>
              <DashboardLayoutFooterNotesLink>
                Docs
              </DashboardLayoutFooterNotesLink>
              <DashboardLayoutFooterNotesLink>
                Get help
              </DashboardLayoutFooterNotesLink>
            </DashboardLayoutFooterNotesLinkGroup>
          </DashboardLayoutFooterNotes>
        </DashboardLayoutSidebarFooter>
      </DashboardLayoutSidebar>

      <DashboardLayoutContentShell>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </DashboardLayoutContentShell>
    </DashboardLayoutRoot>
  );
}
