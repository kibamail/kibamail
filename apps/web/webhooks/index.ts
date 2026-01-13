/**
 * Webhooks Module
 *
 * This module provides a complete webhook infrastructure for dispatching
 * events to external webhook destinations via Outpost.
 *
 * @example
 * // Import the dispatch function
 * import { dispatchWebhook } from "@/webhooks";
 *
 * // Dispatch a webhook event
 * await dispatchWebhook(workspaceId, "contact.created", {
 *   contactId: contact.id,
 *   sourceType: "API",
 *   formId: null,
 *   importId: null,
 * });
 */

// Main dispatch functions
export { dispatchWebhook, dispatchWebhookBulk } from "./dispatch";
export type { DispatchWebhookOptions, WebhookPayloadFor } from "./dispatch";

// Payload types
export type {
  // Entity types
  WebhookContact,
  WebhookBroadcast,
  WebhookTopicEntity,
  WebhookTag,
  WebhookSegment,
  WebhookForm,
  WebhookFormSubmission,
  WebhookAutomation,
  WebhookAutomationRun,
  WebhookTransactionalEmail,
  WebhookDomain,
  WebhookSuppressionEntry,
  WebhookApiKey,
  WebhookConversation,
  WebhookConversationMessage,
  // Event types
  WebhookEmailEventBase,
  WebhookEmailDeliveryData,
  WebhookEmailBounceData,
  WebhookEmailComplaintData,
  WebhookEmailOpenData,
  WebhookEmailClickData,
  WebhookEmailUnsubscribeData,
  // Utility types
  WebhookTopicName,
  WebhookPayloadMap,
  WebhookPayload,
  WebhookPayloadWithTopic,
  WebhookEvent,
} from "./payloads";

// Job payload types
export type {
  WebhookJobPayloadMap,
  WebhookJobPayload,
  AnyWebhookJobPayload,
  DispatchWebhookJobData,
} from "./job-payloads";

// Outpost client (for direct access if needed)
export { outpost } from "./client/client";
