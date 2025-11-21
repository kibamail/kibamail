"use client";

import { CreateWebhookButton } from "./create-webhook-button";
import { useWebhooksContext } from "./webhooks-layout-client";

/**
 * Create Webhook Button Wrapper
 *
 * Uses the webhooks context to get the necessary data for creating a webhook.
 * This is needed because the settings tabs container is a client component.
 */
export function CreateWebhookButtonWrapper() {
  const context = useWebhooksContext();

  // If context is not available (not on webhooks page), don't render
  if (!context) {
    return null;
  }

  const { destinationTypes, topics } = context;

  return (
    <CreateWebhookButton destinationTypes={destinationTypes} topics={topics} />
  );
}
