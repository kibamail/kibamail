import { getSession } from "@/lib/auth/get-session";
import { outpost } from "@/webhooks/client/client";
import type { WebhookDestination } from "@/webhooks/client/types";
import { WebhooksPageClient } from "./_components/webhooks-page-client";

export default async function WebhooksPage() {
  const ctx = await getSession();

  const tenant = await outpost
    .tenants(ctx.currentOrganization?.id as string)
    .upsert();

  const tenantId = tenant?.id as string;

  const destinations = await outpost.tenants(tenantId).destinations().list();

  const destinationsWithoutSecrets =
    destinations?.map(({ credentials, ...destination }) => destination) || [];

  return (
    <WebhooksPageClient
      destinations={destinationsWithoutSecrets as WebhookDestination[]}
    />
  );
}
