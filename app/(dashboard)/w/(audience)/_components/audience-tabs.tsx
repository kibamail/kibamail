"use client";

import * as Tabs from "@kibamail/owly/tabs";
import Link from "next/link";

/**
 * Audience Navigation Tabs
 *
 * Client component that handles audience navigation tabs.
 */
export function AudienceTabs() {
  return (
    <Tabs.List>
      <Link href="/w/contacts">
        <Tabs.Trigger value="contacts">Contacts</Tabs.Trigger>
      </Link>
      <Link href="/w/properties">
        <Tabs.Trigger value="properties">Properties</Tabs.Trigger>
      </Link>
      <Link href="/w/topics">
        <Tabs.Trigger value="topics">Topics</Tabs.Trigger>
      </Link>
      <Link href="/w/segments">
        <Tabs.Trigger value="segments">Segments</Tabs.Trigger>
      </Link>
      <Tabs.Indicator />
    </Tabs.List>
  );
}
