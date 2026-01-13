/**
 * Webhook Job Payload Types
 *
 * Defines the minimal payload (IDs only) for each webhook topic.
 * These are the inputs to the webhook dispatch job, which will
 * enrich the data by fetching full entities from the database.
 */

import type { WebhookTopicName } from "./payloads";

// =============================================================================
// JOB PAYLOAD DEFINITIONS BY TOPIC
// =============================================================================

/**
 * Maps each webhook topic to the IDs needed to enrich it
 */
export interface WebhookJobPayloadMap {
  // -------------------------------------------------------------------------
  // EMAIL DELIVERY EVENTS
  // -------------------------------------------------------------------------
  "email.delivered": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    responseCode: number;
    responseMessage: string;
  };

  "email.bounced": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    bounceType: "hard" | "soft";
    bounceClassification: string;
    responseCode: number;
    responseMessage: string;
  };

  "email.soft_bounced": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    bounceClassification: string;
    responseCode: number;
    responseMessage: string;
  };

  "email.complained": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    feedbackType: string;
  };

  "email.rejected": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    responseCode: number;
    responseMessage: string;
  };

  "email.failed": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    responseCode: number;
    responseMessage: string;
  };

  "email.queued": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
  };

  // -------------------------------------------------------------------------
  // EMAIL ENGAGEMENT EVENTS
  // -------------------------------------------------------------------------
  "email.opened": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    country: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
  };

  "email.clicked": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    url: string;
    userAgent: string | null;
    ipAddress: string | null;
    country: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
  };

  "email.unsubscribed": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
    topicId: string | null;
    method: "link" | "list_unsubscribe";
  };

  "email.list_unsubscribed": {
    sendingId: string;
    contactId: string | null;
    broadcastId: string | null;
  };

  // -------------------------------------------------------------------------
  // CONTACT EVENTS
  // -------------------------------------------------------------------------
  "contact.created": {
    contactId: string;
    sourceType: "MANUAL" | "IMPORT" | "FORM" | "API";
    formId: string | null;
    importId: string | null;
  };

  "contact.updated": {
    contactId: string;
    previousValues: Record<string, unknown>;
    changedFields: string[];
  };

  "contact.deleted": {
    contactId: string;
  };

  "contact.subscribed": {
    contactId: string;
    method: "form" | "api" | "manual" | "import" | "double_opt_in";
    formId: string | null;
  };

  "contact.unsubscribed": {
    contactId: string;
    method: "link" | "list_unsubscribe" | "api" | "manual";
    reason: string | null;
  };

  "contact.status_changed": {
    contactId: string;
    previousStatus: string;
    newStatus: string;
    reason: string | null;
  };

  // -------------------------------------------------------------------------
  // TOPIC SUBSCRIPTION EVENTS
  // -------------------------------------------------------------------------
  "contact.topic_subscribed": {
    contactId: string;
    topicId: string;
  };

  "contact.topic_unsubscribed": {
    contactId: string;
    topicId: string;
    method: "link" | "api" | "manual";
  };

  "topic.created": {
    topicId: string;
  };

  "topic.updated": {
    topicId: string;
    previousValues: Record<string, unknown>;
    changedFields: string[];
  };

  "topic.deleted": {
    topicId: string;
  };

  // -------------------------------------------------------------------------
  // TAG EVENTS
  // -------------------------------------------------------------------------
  "contact.tagged": {
    contactId: string;
    tagId: string;
  };

  "contact.untagged": {
    contactId: string;
    tagId: string;
  };

  "tag.created": {
    tagId: string;
  };

  "tag.updated": {
    tagId: string;
    previousValues: Record<string, unknown>;
    changedFields: string[];
  };

  "tag.deleted": {
    tagId: string;
  };

  // -------------------------------------------------------------------------
  // BROADCAST/CAMPAIGN EVENTS
  // -------------------------------------------------------------------------
  "broadcast.created": {
    broadcastId: string;
  };

  "broadcast.updated": {
    broadcastId: string;
    previousValues: Record<string, unknown>;
    changedFields: string[];
  };

  "broadcast.scheduled": {
    broadcastId: string;
    scheduledFor: string;
  };

  "broadcast.sent": {
    broadcastId: string;
  };

  "broadcast.paused": {
    broadcastId: string;
    reason: string | null;
  };

  "broadcast.cancelled": {
    broadcastId: string;
    reason: string | null;
  };

  "broadcast.failed": {
    broadcastId: string;
    error: string;
  };

  // -------------------------------------------------------------------------
  // TRANSACTIONAL EMAIL EVENTS
  // -------------------------------------------------------------------------
  "transactional_email.sent": {
    transactionalEmailId: string;
  };

  "transactional_email.delivered": {
    transactionalEmailId: string;
    responseCode: number;
    responseMessage: string;
  };

  "transactional_email.bounced": {
    transactionalEmailId: string;
    bounceType: "hard" | "soft";
    bounceClassification: string;
    responseCode: number;
    responseMessage: string;
  };

  "transactional_email.complained": {
    transactionalEmailId: string;
    feedbackType: string;
  };

  "transactional_email.opened": {
    transactionalEmailId: string;
    userAgent: string | null;
    ipAddress: string | null;
    country: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
  };

  "transactional_email.clicked": {
    transactionalEmailId: string;
    url: string;
    userAgent: string | null;
    ipAddress: string | null;
    country: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
  };

  // -------------------------------------------------------------------------
  // SEGMENT EVENTS
  // -------------------------------------------------------------------------
  "segment.created": {
    segmentId: string;
  };

  "segment.updated": {
    segmentId: string;
    previousValues: Record<string, unknown>;
    changedFields: string[];
  };

  "segment.deleted": {
    segmentId: string;
  };

  "segment.contact_entered": {
    segmentId: string;
    contactId: string;
  };

  "segment.contact_exited": {
    segmentId: string;
    contactId: string;
  };

  // -------------------------------------------------------------------------
  // FORM EVENTS
  // -------------------------------------------------------------------------
  "form.created": {
    formId: string;
  };

  "form.updated": {
    formId: string;
    previousValues: Record<string, unknown>;
    changedFields: string[];
  };

  "form.published": {
    formId: string;
  };

  "form.unpublished": {
    formId: string;
  };

  "form.submission": {
    formId: string;
    submissionId: string;
  };

  "form.submission_verified": {
    formId: string;
    submissionId: string;
  };

  "form.submission_spam": {
    formId: string;
    submissionId: string;
    spamReason: string;
  };

  // -------------------------------------------------------------------------
  // AUTOMATION EVENTS
  // -------------------------------------------------------------------------
  "automation.created": {
    automationId: string;
  };

  "automation.updated": {
    automationId: string;
    previousValues: Record<string, unknown>;
    changedFields: string[];
  };

  "automation.published": {
    automationId: string;
  };

  "automation.paused": {
    automationId: string;
    reason: string | null;
  };

  "automation.contact_entered": {
    automationId: string;
    automationRunId: string;
    contactId: string;
    triggerType: string;
    triggerSourceId: string | null;
  };

  "automation.contact_exited": {
    automationId: string;
    automationRunId: string;
    contactId: string;
    exitReason: "completed" | "failed" | "cancelled" | "unsubscribed";
  };

  "automation.step_completed": {
    automationId: string;
    automationRunId: string;
    contactId: string;
    nodeId: string;
    nodeType: string;
    nodeName: string | null;
  };

  "automation.failed": {
    automationId: string;
    automationRunId: string;
    contactId: string;
    error: string;
    failedNodeId: string | null;
  };

  // -------------------------------------------------------------------------
  // CONVERSATION/INBOX EVENTS
  // -------------------------------------------------------------------------
  "conversation.created": {
    conversationId: string;
    initialMessageId: string;
  };

  "conversation.message_received": {
    conversationId: string;
    messageId: string;
  };

  "conversation.message_sent": {
    conversationId: string;
    messageId: string;
  };

  "conversation.closed": {
    conversationId: string;
  };

  "conversation.archived": {
    conversationId: string;
  };

  // -------------------------------------------------------------------------
  // DOMAIN EVENTS
  // -------------------------------------------------------------------------
  "domain.created": {
    domainId: string;
  };

  "domain.verified": {
    domainId: string;
    verificationType:
      | "dkim"
      | "return_path"
      | "tracking"
      | "tracking_ssl"
      | "dmarc"
      | "full";
  };

  "domain.verification_failed": {
    domainId: string;
    verificationType:
      | "dkim"
      | "return_path"
      | "tracking"
      | "tracking_ssl"
      | "dmarc";
    error: string;
  };

  "domain.deleted": {
    domainId: string;
  };

  // -------------------------------------------------------------------------
  // SUPPRESSION LIST EVENTS
  // -------------------------------------------------------------------------
  "suppression.added": {
    suppressionId: string;
  };

  "suppression.removed": {
    suppressionId: string;
  };

  // -------------------------------------------------------------------------
  // API KEY EVENTS
  // -------------------------------------------------------------------------
  "api_key.created": {
    apiKeyId: string;
  };

  "api_key.revoked": {
    apiKeyId: string;
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Get the job payload type for a specific topic
 */
export type WebhookJobPayload<T extends WebhookTopicName> =
  WebhookJobPayloadMap[T];

/**
 * Union type of all possible job payloads
 */
export type AnyWebhookJobPayload = {
  [K in WebhookTopicName]: { topic: K } & WebhookJobPayloadMap[K];
}[WebhookTopicName];

/**
 * The actual job data structure sent to the queue
 */
export interface DispatchWebhookJobData<
  T extends WebhookTopicName = WebhookTopicName,
> {
  /** Workspace ID for tenant routing */
  workspaceId: string;
  /** Webhook topic */
  topic: T;
  /** Topic-specific payload with IDs */
  payload: T extends WebhookTopicName ? WebhookJobPayloadMap[T] : never;
  /** ISO timestamp when the event occurred */
  timestamp: string;
  /** Optional idempotency key */
  idempotencyKey?: string;
}
