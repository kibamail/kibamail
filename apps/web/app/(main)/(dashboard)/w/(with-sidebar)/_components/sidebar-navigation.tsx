"use client";

import {
  DashboardLayoutSidebarGroup,
  DashboardLayoutSidebarItem,
} from "@kibamail/owly/dashboard-layout";
import {
  Component,
  Globe,
  HomeAltSlimHoriz,
  Mail,
  MailIn,
  NetworkReverse,
  SendDiagonal,
  Settings,
  User,
} from "iconoir-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar Navigation
 *
 * Client component that handles sidebar navigation with active state detection.
 * Manually checks pathname to determine which navigation item is active.
 */
export function SidebarNavigation() {
  const pathname = usePathname();

  const isSettingsActive = pathname.startsWith("/w/settings");
  const isAutomationsActive = pathname.startsWith("/w/automations");
  const isFormsActive = pathname.startsWith("/w/forms");
  const isBroadcastsActive = pathname.startsWith("/w/broadcasts");
  const isDomainsActive = pathname.startsWith("/w/domains");
  const isAudienceActive =
    pathname.startsWith("/w/contacts") ||
    pathname.startsWith("/w/segments") ||
    pathname.startsWith("/w/topics") ||
    pathname.startsWith("/w/properties");
  const isTemplatesActive = pathname.startsWith("/w/templates");
  const isEmailsActive = pathname.startsWith("/w/emails");
  const isInboxActive = pathname.startsWith("/w/inbox");
  const isMarketingEmailsActive = pathname.startsWith("/w/marketing-emails");
  const isDashboardActive =
    !isSettingsActive &&
    !isAutomationsActive &&
    !isAudienceActive &&
    !isFormsActive &&
    !isBroadcastsActive &&
    !isDomainsActive &&
    !isTemplatesActive &&
    !isEmailsActive &&
    !isInboxActive &&
    !isMarketingEmailsActive;

  return (
    <>
      {/* Dashboard - standalone at top */}
      <DashboardLayoutSidebarGroup>
        <DashboardLayoutSidebarItem asChild active={isDashboardActive}>
          <Link href="/w/">
            <HomeAltSlimHoriz />
            Dashboard
          </Link>
        </DashboardLayoutSidebarItem>
      </DashboardLayoutSidebarGroup>

      {/* Marketing Group */}
      <DashboardLayoutSidebarGroup title="Marketing">
        <DashboardLayoutSidebarItem asChild active={isAudienceActive}>
          <Link href="/w/contacts">
            <User />
            Audience
          </Link>
        </DashboardLayoutSidebarItem>
        <DashboardLayoutSidebarItem asChild active={isBroadcastsActive}>
          <Link href="/w/broadcasts">
            <SendDiagonal />
            Broadcasts
          </Link>
        </DashboardLayoutSidebarItem>
        <DashboardLayoutSidebarItem asChild active={isFormsActive}>
          <Link href="/w/forms">
            <Component />
            Forms
          </Link>
        </DashboardLayoutSidebarItem>
        <DashboardLayoutSidebarItem asChild active={isAutomationsActive}>
          <Link href="/w/automations">
            <NetworkReverse />
            Automations
          </Link>
        </DashboardLayoutSidebarItem>
        <DashboardLayoutSidebarItem asChild active={isMarketingEmailsActive}>
          <Link href="/w/marketing-emails">
            <Mail />
            Marketing Emails
          </Link>
        </DashboardLayoutSidebarItem>
        <DashboardLayoutSidebarItem asChild active={isInboxActive}>
          <Link href="/w/inbox">
            <MailIn />
            Inbox
          </Link>
        </DashboardLayoutSidebarItem>
      </DashboardLayoutSidebarGroup>

      {/* Transactional Group */}
      <DashboardLayoutSidebarGroup title="Transactional">
        <DashboardLayoutSidebarItem asChild active={isTemplatesActive}>
          <Link href="/w/templates">
            <Component />
            Templates
          </Link>
        </DashboardLayoutSidebarItem>
        <DashboardLayoutSidebarItem asChild active={isEmailsActive}>
          <Link href="/w/emails">
            <Mail />
            Emails
          </Link>
        </DashboardLayoutSidebarItem>
      </DashboardLayoutSidebarGroup>

      {/* Workspace Group */}
      <DashboardLayoutSidebarGroup title="Workspace">
        <DashboardLayoutSidebarItem asChild active={isDomainsActive}>
          <Link href="/w/domains">
            <Globe />
            Domains
          </Link>
        </DashboardLayoutSidebarItem>
        <DashboardLayoutSidebarItem asChild active={isSettingsActive}>
          <Link href="/w/settings">
            <Settings />
            Settings
          </Link>
        </DashboardLayoutSidebarItem>
      </DashboardLayoutSidebarGroup>
    </>
  );
}
