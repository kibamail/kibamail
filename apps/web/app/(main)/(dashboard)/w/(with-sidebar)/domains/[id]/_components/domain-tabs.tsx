"use client";

import * as Tabs from "@kibamail/owly/tabs";
import Link from "next/link";

interface DomainTabsProps {
  domainId: string;
}

/**
 * Domain Navigation Tabs
 *
 * Client component that handles domain detail page navigation tabs.
 */
export function DomainTabs({ domainId }: DomainTabsProps) {
  return (
    <Tabs.List>
      <Link href={`/w/domains/${domainId}`}>
        <Tabs.Trigger value="details">Domain Details</Tabs.Trigger>
      </Link>
      <Link href={`/w/domains/${domainId}/senders`}>
        <Tabs.Trigger value="senders">Sender Identities</Tabs.Trigger>
      </Link>
      <Tabs.Indicator />
    </Tabs.List>
  );
}
