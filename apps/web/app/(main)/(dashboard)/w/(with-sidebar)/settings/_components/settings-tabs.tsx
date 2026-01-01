"use client";

import * as Tabs from "@kibamail/owly/tabs";
import Link from "next/link";

/**
 * Settings Navigation Tabs
 *
 * Client component that handles settings navigation tabs.
 */
export function SettingsTabs() {
  return (
    <Tabs.List>
      <Link href="/w/settings/workspace">
        <Tabs.Trigger value="workspace">Workspace</Tabs.Trigger>
      </Link>
      <Link href="/w/settings/usage">
        <Tabs.Trigger value="usage">Usage</Tabs.Trigger>
      </Link>
      <Link href="/w/settings/billing">
        <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
      </Link>
      <Link href="/w/settings/api-keys">
        <Tabs.Trigger value="api-keys">Api keys</Tabs.Trigger>
      </Link>
      <Link href="/w/settings/webhooks">
        <Tabs.Trigger value="webhooks">Webhooks</Tabs.Trigger>
      </Link>
      <Tabs.Indicator />
    </Tabs.List>
  );
}
