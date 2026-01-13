/**
 * Webhook Payload Types
 *
 * Defines fully typed payloads for all webhook events.
 * These types represent the data structure sent to webhook destinations.
 */

// =============================================================================
// BASE ENTITY TYPES (Public-safe representations)
// =============================================================================

/**
 * Contact entity for webhook payloads
 */
export interface WebhookContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  city: string | null;
  status: "UNCONFIRMED" | "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED" | "ARCHIVED";
  sourceType: "MANUAL" | "IMPORT" | "FORM" | "API";
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customProperties: Record<string, string | number | null>;
}

/**
 * Broadcast entity for webhook payloads
 */
export interface WebhookBroadcast {
  id: string;
  name: string;
  status: "DRAFT" | "QUEUED_FOR_SENDING" | "SENDING" | "SENT" | "SENDING_FAILED" | "DRAFT_ARCHIVED" | "ARCHIVED";
  isAbTest: boolean;
  sendAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalQueued: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalComplained: number;
    totalFailed: number;
    totalUnsubscribed: number;
  };
}

/**
 * Topic entity for webhook payloads
 */
export interface WebhookTopicEntity {
  id: string;
  name: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  defaultOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tag entity for webhook payloads
 */
export interface WebhookTag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Segment entity for webhook payloads
 */
export interface WebhookSegment {
  id: string;
  name: string;
  description: string | null;
  type: "DYNAMIC" | "STATIC";
  createdAt: string;
  updatedAt: string;
}

/**
 * Form entity for webhook payloads
 */
export interface WebhookForm {
  id: string;
  name: string;
  description: string | null;
  type: "SIGN_UP" | "SURVEY";
  display: "POPUP" | "INLINE_EMBED";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  slug: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form submission entity for webhook payloads
 */
export interface WebhookFormSubmission {
  id: string;
  formId: string;
  contactId: string | null;
  status: "PENDING" | "PROCESSED" | "SPAM" | "FAILED";
  ipAddress: string | null;
  userAgent: string | null;
  referrerUrl: string | null;
  landingPageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  fields: Record<string, string | number | null>;
}

/**
 * Automation entity for webhook payloads
 */
export interface WebhookAutomation {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  triggerType: "CONTACT_SUBSCRIBED" | "PROPERTY_UPDATED" | "FORM_SUBMITTED" | "API" | "EVENT" | "SEGMENT_ENTRY" | "SEGMENT_EXIT" | "EMAIL_ENGAGEMENT";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Automation run entity for webhook payloads
 */
export interface WebhookAutomationRun {
  id: string;
  automationId: string;
  contactId: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED" | "PAUSED";
  currentNodeId: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

/**
 * Sending domain entity for webhook payloads
 */
export interface WebhookDomain {
  id: string;
  name: string;
  dkimVerifiedAt: string | null;
  returnPathDomainVerifiedAt: string | null;
  trackingDomainVerifiedAt: string | null;
  trackingDomainSslVerifiedAt: string | null;
  dmarcVerifiedAt: string | null;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Suppression list entry for webhook payloads
 */
export interface WebhookSuppressionEntry {
  id: string;
  email: string;
  contactId: string | null;
  scope: "GLOBAL" | "TOPIC";
  topicId: string | null;
  reason: "MANUAL" | "BOUNCED" | "COMPLAINED" | "UNSUBSCRIBED" | "LEGAL_REQUEST" | "INVALID_EMAIL";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * API key entity for webhook payloads (safe fields only)
 */
export interface WebhookApiKey {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transactional email entity for webhook payloads
 */
export interface WebhookTransactionalEmail {
  id: string;
  sendingId: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  status: "QUEUED" | "SENDING" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED";
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  firstOpenedAt: string | null;
  firstClickedAt: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  openCount: number;
  clickCount: number;
}

/**
 * Conversation entity for webhook payloads
 */
export interface WebhookConversation {
  id: string;
  contactId: string | null;
  contactEmail: string;
  subject: string;
  status: "OPEN" | "CLOSED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation message entity for webhook payloads
 */
export interface WebhookConversationMessage {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  fromEmail: string;
  toEmail: string;
  subject: string;
  textContent: string | null;
  createdAt: string;
}

// =============================================================================
// EMAIL EVENT TYPES
// =============================================================================

/**
 * Base email event data included in all email webhook events
 */
export interface WebhookEmailEventBase {
  sendingId: string;
  recipient: string;
  timestamp: string;
}

/**
 * Email delivery event data
 */
export interface WebhookEmailDeliveryData extends WebhookEmailEventBase {
  responseCode: number;
  responseMessage: string;
}

/**
 * Email bounce event data
 */
export interface WebhookEmailBounceData extends WebhookEmailEventBase {
  bounceType: "hard" | "soft";
  bounceClassification: string;
  responseCode: number;
  responseMessage: string;
}

/**
 * Email complaint (spam report) event data
 */
export interface WebhookEmailComplaintData extends WebhookEmailEventBase {
  feedbackType: string;
}

/**
 * Email open event data
 */
export interface WebhookEmailOpenData extends WebhookEmailEventBase {
  userAgent: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
}

/**
 * Email click event data
 */
export interface WebhookEmailClickData extends WebhookEmailEventBase {
  url: string;
  userAgent: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
}

/**
 * Email unsubscribe event data
 */
export interface WebhookEmailUnsubscribeData extends WebhookEmailEventBase {
  method: "link" | "list_unsubscribe";
  topicId: string | null;
}

// =============================================================================
// WEBHOOK PAYLOAD DEFINITIONS BY TOPIC
// =============================================================================

export interface WebhookPayloadMap {
  // -------------------------------------------------------------------------
  // EMAIL DELIVERY EVENTS
  // -------------------------------------------------------------------------
  "email.delivered": {
    event: WebhookEmailDeliveryData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.bounced": {
    event: WebhookEmailBounceData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.soft_bounced": {
    event: WebhookEmailBounceData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.complained": {
    event: WebhookEmailComplaintData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.rejected": {
    event: WebhookEmailDeliveryData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.failed": {
    event: WebhookEmailDeliveryData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.queued": {
    event: WebhookEmailEventBase;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  // -------------------------------------------------------------------------
  // EMAIL ENGAGEMENT EVENTS
  // -------------------------------------------------------------------------
  "email.opened": {
    event: WebhookEmailOpenData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.clicked": {
    event: WebhookEmailClickData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  "email.unsubscribed": {
    event: WebhookEmailUnsubscribeData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
    topic: WebhookTopicEntity | null;
  };

  "email.list_unsubscribed": {
    event: WebhookEmailUnsubscribeData;
    contact: WebhookContact | null;
    broadcast: WebhookBroadcast | null;
  };

  // -------------------------------------------------------------------------
  // CONTACT EVENTS
  // -------------------------------------------------------------------------
  "contact.created": {
    contact: WebhookContact;
    source: {
      type: "MANUAL" | "IMPORT" | "FORM" | "API";
      formId: string | null;
      importId: string | null;
    };
  };

  "contact.updated": {
    contact: WebhookContact;
    previousValues: Partial<WebhookContact>;
    changedFields: string[];
  };

  "contact.deleted": {
    contact: WebhookContact;
  };

  "contact.subscribed": {
    contact: WebhookContact;
    method: "form" | "api" | "manual" | "import" | "double_opt_in";
    formId: string | null;
  };

  "contact.unsubscribed": {
    contact: WebhookContact;
    method: "link" | "list_unsubscribe" | "api" | "manual";
    reason: string | null;
  };

  "contact.status_changed": {
    contact: WebhookContact;
    previousStatus: WebhookContact["status"];
    newStatus: WebhookContact["status"];
    reason: string | null;
  };

  // -------------------------------------------------------------------------
  // TOPIC SUBSCRIPTION EVENTS
  // -------------------------------------------------------------------------
  "contact.topic_subscribed": {
    contact: WebhookContact;
    topic: WebhookTopicEntity;
  };

  "contact.topic_unsubscribed": {
    contact: WebhookContact;
    topic: WebhookTopicEntity;
    method: "link" | "api" | "manual";
  };

  "topic.created": {
    topic: WebhookTopicEntity;
  };

  "topic.updated": {
    topic: WebhookTopicEntity;
    previousValues: Partial<WebhookTopicEntity>;
    changedFields: string[];
  };

  "topic.deleted": {
    topic: WebhookTopicEntity;
  };

  // -------------------------------------------------------------------------
  // TAG EVENTS
  // -------------------------------------------------------------------------
  "contact.tagged": {
    contact: WebhookContact;
    tag: WebhookTag;
  };

  "contact.untagged": {
    contact: WebhookContact;
    tag: WebhookTag;
  };

  "tag.created": {
    tag: WebhookTag;
  };

  "tag.updated": {
    tag: WebhookTag;
    previousValues: Partial<WebhookTag>;
    changedFields: string[];
  };

  "tag.deleted": {
    tag: WebhookTag;
  };

  // -------------------------------------------------------------------------
  // BROADCAST/CAMPAIGN EVENTS
  // -------------------------------------------------------------------------
  "broadcast.created": {
    broadcast: WebhookBroadcast;
  };

  "broadcast.updated": {
    broadcast: WebhookBroadcast;
    previousValues: Partial<WebhookBroadcast>;
    changedFields: string[];
  };

  "broadcast.scheduled": {
    broadcast: WebhookBroadcast;
    scheduledFor: string;
  };

  "broadcast.sent": {
    broadcast: WebhookBroadcast;
  };

  "broadcast.paused": {
    broadcast: WebhookBroadcast;
    reason: string | null;
  };

  "broadcast.cancelled": {
    broadcast: WebhookBroadcast;
    reason: string | null;
  };

  "broadcast.failed": {
    broadcast: WebhookBroadcast;
    error: string;
  };

  // -------------------------------------------------------------------------
  // TRANSACTIONAL EMAIL EVENTS
  // -------------------------------------------------------------------------
  "transactional_email.sent": {
    transactionalEmail: WebhookTransactionalEmail;
    contact: WebhookContact | null;
  };

  "transactional_email.delivered": {
    transactionalEmail: WebhookTransactionalEmail;
    contact: WebhookContact | null;
    event: WebhookEmailDeliveryData;
  };

  "transactional_email.bounced": {
    transactionalEmail: WebhookTransactionalEmail;
    contact: WebhookContact | null;
    event: WebhookEmailBounceData;
  };

  "transactional_email.complained": {
    transactionalEmail: WebhookTransactionalEmail;
    contact: WebhookContact | null;
    event: WebhookEmailComplaintData;
  };

  "transactional_email.opened": {
    transactionalEmail: WebhookTransactionalEmail;
    contact: WebhookContact | null;
    event: WebhookEmailOpenData;
  };

  "transactional_email.clicked": {
    transactionalEmail: WebhookTransactionalEmail;
    contact: WebhookContact | null;
    event: WebhookEmailClickData;
  };

  // -------------------------------------------------------------------------
  // SEGMENT EVENTS
  // -------------------------------------------------------------------------
  "segment.created": {
    segment: WebhookSegment;
  };

  "segment.updated": {
    segment: WebhookSegment;
    previousValues: Partial<WebhookSegment>;
    changedFields: string[];
  };

  "segment.deleted": {
    segment: WebhookSegment;
  };

  "segment.contact_entered": {
    segment: WebhookSegment;
    contact: WebhookContact;
  };

  "segment.contact_exited": {
    segment: WebhookSegment;
    contact: WebhookContact;
  };

  // -------------------------------------------------------------------------
  // FORM EVENTS
  // -------------------------------------------------------------------------
  "form.created": {
    form: WebhookForm;
  };

  "form.updated": {
    form: WebhookForm;
    previousValues: Partial<WebhookForm>;
    changedFields: string[];
  };

  "form.published": {
    form: WebhookForm;
  };

  "form.unpublished": {
    form: WebhookForm;
  };

  "form.submission": {
    form: WebhookForm;
    submission: WebhookFormSubmission;
    contact: WebhookContact | null;
  };

  "form.submission_verified": {
    form: WebhookForm;
    submission: WebhookFormSubmission;
    contact: WebhookContact;
  };

  "form.submission_spam": {
    form: WebhookForm;
    submission: WebhookFormSubmission;
    spamReason: string;
  };

  // -------------------------------------------------------------------------
  // AUTOMATION EVENTS
  // -------------------------------------------------------------------------
  "automation.created": {
    automation: WebhookAutomation;
  };

  "automation.updated": {
    automation: WebhookAutomation;
    previousValues: Partial<WebhookAutomation>;
    changedFields: string[];
  };

  "automation.published": {
    automation: WebhookAutomation;
  };

  "automation.paused": {
    automation: WebhookAutomation;
    reason: string | null;
  };

  "automation.contact_entered": {
    automation: WebhookAutomation;
    automationRun: WebhookAutomationRun;
    contact: WebhookContact;
    trigger: {
      type: WebhookAutomation["triggerType"];
      sourceId: string | null;
    };
  };

  "automation.contact_exited": {
    automation: WebhookAutomation;
    automationRun: WebhookAutomationRun;
    contact: WebhookContact;
    exitReason: "completed" | "failed" | "cancelled" | "unsubscribed";
  };

  "automation.step_completed": {
    automation: WebhookAutomation;
    automationRun: WebhookAutomationRun;
    contact: WebhookContact;
    step: {
      nodeId: string;
      nodeType: string;
      nodeName: string | null;
    };
  };

  "automation.failed": {
    automation: WebhookAutomation;
    automationRun: WebhookAutomationRun;
    contact: WebhookContact;
    error: string;
    failedNodeId: string | null;
  };

  // -------------------------------------------------------------------------
  // CONVERSATION/INBOX EVENTS
  // -------------------------------------------------------------------------
  "conversation.created": {
    conversation: WebhookConversation;
    contact: WebhookContact | null;
    initialMessage: WebhookConversationMessage;
  };

  "conversation.message_received": {
    conversation: WebhookConversation;
    contact: WebhookContact | null;
    message: WebhookConversationMessage;
  };

  "conversation.message_sent": {
    conversation: WebhookConversation;
    contact: WebhookContact | null;
    message: WebhookConversationMessage;
  };

  "conversation.closed": {
    conversation: WebhookConversation;
    contact: WebhookContact | null;
  };

  "conversation.archived": {
    conversation: WebhookConversation;
    contact: WebhookContact | null;
  };

  // -------------------------------------------------------------------------
  // DOMAIN EVENTS
  // -------------------------------------------------------------------------
  "domain.created": {
    domain: WebhookDomain;
  };

  "domain.verified": {
    domain: WebhookDomain;
    verificationType: "dkim" | "return_path" | "tracking" | "tracking_ssl" | "dmarc" | "full";
  };

  "domain.verification_failed": {
    domain: WebhookDomain;
    verificationType: "dkim" | "return_path" | "tracking" | "tracking_ssl" | "dmarc";
    error: string;
  };

  "domain.deleted": {
    domain: WebhookDomain;
  };

  // -------------------------------------------------------------------------
  // SUPPRESSION LIST EVENTS
  // -------------------------------------------------------------------------
  "suppression.added": {
    entry: WebhookSuppressionEntry;
    contact: WebhookContact | null;
    topic: WebhookTopicEntity | null;
  };

  "suppression.removed": {
    entry: WebhookSuppressionEntry;
    contact: WebhookContact | null;
  };

  // -------------------------------------------------------------------------
  // API KEY EVENTS
  // -------------------------------------------------------------------------
  "api_key.created": {
    apiKey: WebhookApiKey;
  };

  "api_key.revoked": {
    apiKey: WebhookApiKey;
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * All valid webhook topic names
 */
export type WebhookTopicName = keyof WebhookPayloadMap;

/**
 * Get the payload type for a specific topic
 */
export type WebhookPayload<T extends WebhookTopicName> = WebhookPayloadMap[T];

/**
 * Webhook payload with topic included in the data
 * This is the actual shape sent to webhook destinations
 */
export type WebhookPayloadWithTopic<T extends WebhookTopicName> = {
  topic: T;
} & WebhookPayloadMap[T];

/**
 * Full webhook event envelope sent to destinations
 */
export interface WebhookEvent<T extends WebhookTopicName = WebhookTopicName> {
  /**
   * Unique event ID
   */
  id: string;

  /**
   * Event topic/type
   */
  topic: T;

  /**
   * Workspace ID that owns this event
   */
  workspaceId: string;

  /**
   * ISO 8601 timestamp when the event occurred
   */
  timestamp: string;

  /**
   * Event-specific payload data (includes topic for convenience)
   */
  data: WebhookPayloadWithTopic<T>;
}

/**
 * Type-safe function signature for publishing webhook events
 */
export type PublishWebhookEvent = <T extends WebhookTopicName>(
  workspaceId: string,
  topic: T,
  data: WebhookPayloadMap[T]
) => Promise<{ id: string }>;
