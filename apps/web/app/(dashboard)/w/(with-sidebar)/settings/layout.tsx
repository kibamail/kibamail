import type { PropsWithChildren } from "react";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/get-session";
import { outpost } from "@/webhooks/client/client";
import type { WebhookDestinationType } from "@/webhooks/client/types";
import { SettingsTabsContainer } from "./_components/settings-tabs-container";
import { WebhooksLayoutClient } from "./webhooks/_components/webhooks-layout-client";

export default async function SettingsLayout({ children }: PropsWithChildren) {
  const headersList = await headers();
  const currentPath = headersList.get("x-current-path") || "";
  const isWebhooksPage = currentPath.includes("/settings/webhooks");

  let destinationTypes: WebhookDestinationType[] = [];
  let topics: string[] = [];

  if (isWebhooksPage) {
    const ctx = await getSession();
    const tenant = await outpost
      .tenants(ctx.currentOrganization?.id as string)
      .upsert();
    const tenantId = tenant?.id as string;

    const fetchedDestinationTypes = await outpost
      .tenants(tenantId)
      .destinations()
      .types();
    const fetchedTopics = await outpost.topics().list();

    destinationTypes = (fetchedDestinationTypes ||
      []) as WebhookDestinationType[];
    topics = fetchedTopics || [];
  }

  return (
    <WebhooksLayoutClient destinationTypes={destinationTypes} topics={topics}>
      <SettingsTabsContainer>{children}</SettingsTabsContainer>
    </WebhooksLayoutClient>
  );
}
