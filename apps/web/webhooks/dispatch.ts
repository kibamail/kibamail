/**
 * Webhook Dispatch Helper
 *
 * Provides a type-safe interface for dispatching webhooks from anywhere
 * in the application. This queues the webhook for background processing,
 * where the data will be enriched and sent to Outpost.
 *
 * @example
 * // Dispatch a contact.created webhook
 * await dispatchWebhook(workspaceId, "contact.created", {
 *   contactId: "contact_123",
 *   sourceType: "API",
 *   formId: null,
 *   importId: null,
 * });
 *
 * @example
 * // Dispatch an email.delivered webhook
 * await dispatchWebhook(workspaceId, "email.delivered", {
 *   sendingId: "sending_456",
 *   contactId: "contact_123",
 *   broadcastId: "broadcast_789",
 *   responseCode: 250,
 *   responseMessage: "OK",
 * });
 */

import { queue } from "@/lib/queue";
import type { WebhookTopicName } from "./payloads";
import type { WebhookJobPayloadMap } from "./job-payloads";

/**
 * Options for dispatching a webhook
 */
export interface DispatchWebhookOptions {
  /**
   * Delay in milliseconds before processing the webhook
   * Useful for debouncing rapid updates
   */
  delay?: number;

  /**
   * Custom timestamp for when the event occurred
   * Defaults to current time if not provided
   */
  timestamp?: string;

  /**
   * Idempotency key to prevent duplicate webhook deliveries
   * If provided, Outpost will deduplicate events with the same key
   */
  idempotencyKey?: string;

  /**
   * Priority for the job (higher = higher priority)
   * Default is normal priority
   */
  priority?: number;
}

/**
 * Dispatch a webhook event for background processing
 *
 * This is the primary method for sending webhooks from anywhere in the application.
 * It queues the event for background processing where the minimal ID payload
 * will be enriched with full entity data before being sent to Outpost.
 *
 * @param workspaceId - The workspace ID (used for tenant routing in Outpost)
 * @param topic - The webhook topic (e.g., "contact.created", "email.delivered")
 * @param payload - The topic-specific payload containing entity IDs
 * @param options - Optional configuration for the dispatch
 *
 * @example
 * // Basic usage
 * await dispatchWebhook(workspaceId, "contact.created", {
 *   contactId: contact.id,
 *   sourceType: "API",
 *   formId: null,
 *   importId: null,
 * });
 *
 * @example
 * // With options
 * await dispatchWebhook(
 *   workspaceId,
 *   "broadcast.sent",
 *   { broadcastId: broadcast.id },
 *   {
 *     idempotencyKey: `broadcast-sent-${broadcast.id}`,
 *     priority: 10,
 *   }
 * );
 */
export async function dispatchWebhook<T extends WebhookTopicName>(
  workspaceId: string,
  topic: T,
  payload: WebhookJobPayloadMap[T],
  options: DispatchWebhookOptions = {}
): Promise<void> {
  const { delay, timestamp, idempotencyKey, priority } = options;

  await queue("webhooks").push(
    "dispatch-webhook",
    {
      workspaceId,
      topic,
      payload: payload as Record<string, unknown>,
      timestamp: timestamp ?? new Date().toISOString(),
      idempotencyKey,
    },
    {
      delay,
      priority,
      // Webhooks should be retried on failure
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );
}

/**
 * Dispatch multiple webhook events in bulk
 *
 * More efficient than calling dispatchWebhook multiple times
 * when you need to send many webhooks at once.
 *
 * @param events - Array of webhook events to dispatch
 *
 * @example
 * await dispatchWebhookBulk([
 *   {
 *     workspaceId: "ws_123",
 *     topic: "contact.created",
 *     payload: { contactId: "c1", sourceType: "API", formId: null, importId: null },
 *   },
 *   {
 *     workspaceId: "ws_123",
 *     topic: "contact.created",
 *     payload: { contactId: "c2", sourceType: "API", formId: null, importId: null },
 *   },
 * ]);
 */
export async function dispatchWebhookBulk<T extends WebhookTopicName>(
  events: Array<{
    workspaceId: string;
    topic: T;
    payload: WebhookJobPayloadMap[T];
    options?: DispatchWebhookOptions;
  }>
): Promise<void> {
  if (events.length === 0) return;

  const jobs = events.map((event) => ({
    name: "dispatch-webhook" as const,
    data: {
      workspaceId: event.workspaceId,
      topic: event.topic,
      payload: event.payload as Record<string, unknown>,
      timestamp: event.options?.timestamp ?? new Date().toISOString(),
      idempotencyKey: event.options?.idempotencyKey,
    },
    options: {
      delay: event.options?.delay,
      priority: event.options?.priority,
      attempts: 3,
      backoff: {
        type: "exponential" as const,
        delay: 1000,
      },
    },
  }));

  await queue("webhooks").pushBulk(jobs);
}

/**
 * Helper type for inferring payload type from topic
 */
export type WebhookPayloadFor<T extends WebhookTopicName> =
  WebhookJobPayloadMap[T];
