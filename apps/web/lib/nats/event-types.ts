/**
 * NATS Event Types
 *
 * Types for email events received from email-agent via NATS.
 * These match the EmailEvent struct in apps/email-agent/internal/domain/webhook.go
 */

/**
 * Event types that can be received from the MTA
 */
export type EmailEventType =
  | "Delivery"
  | "Bounce"
  | "TransientFailure"
  | "Feedback"
  | "Reception"
  | "Expiration"
  | "AdminBounce"
  | "OOB"
  | "Rejection";

/**
 * SMTP response details
 */
export interface EventResponse {
  code: number;
  enhanced_code?: {
    class: number;
    subject: number;
    detail: number;
  } | null;
  content: string;
  command?: string | null;
}

/**
 * Email event from email-agent
 *
 * This is the message format published to NATS by email-agent
 * when it receives webhooks from KumoMTA.
 */
export interface EmailEvent {
  /** Event type (Delivery, Bounce, etc.) */
  type: EmailEventType;
  /** Original message ID from KumoMTA */
  sending_id: string;
  /** Recipient email address */
  recipient: string;
  /** Tenant/workspace ID */
  tenant_id: string;
  /** Broadcast ID */
  broadcast_id: string;
  /** Contact ID */
  contact_id: string;
  /** SMTP response details */
  response: EventResponse;
  /** Bounce classification (for bounce events) */
  bounce_classification: string;
  /** Event timestamp (RFC3339) */
  timestamp: string;
  /** KumoMTA node ID */
  node_id: string;
}

/**
 * Batch of events for bulk insertion
 */
export interface EventBatch {
  events: EmailEvent[];
  ackFn: () => Promise<void>;
}

/**
 * Consumer configuration options
 */
export interface EventConsumerConfig {
  /** Batch size for bulk insertion */
  batchSize: number;
  /** Maximum wait time (ms) before flushing a partial batch */
  batchTimeoutMs: number;
  /** Number of concurrent batch processors */
  concurrency: number;
  /** Consumer name for durable subscription */
  consumerName: string;
}

/**
 * Default consumer configuration
 */
export const DEFAULT_CONSUMER_CONFIG: EventConsumerConfig = {
  batchSize: 100,
  batchTimeoutMs: 1000,
  concurrency: 4,
  consumerName: "control-plane-events",
};

/**
 * Map email-agent event types to Prisma EventType enum values
 */
export function mapEventType(type: EmailEventType): string {
  switch (type) {
    case "Delivery":
      return "Delivery";
    case "Bounce":
      return "Bounce";
    case "TransientFailure":
      return "TransientFailure";
    case "Feedback":
      return "Feedback";
    case "Reception":
      return "Reception";
    case "Expiration":
      return "Expiration";
    case "AdminBounce":
      return "AdminBounce";
    case "OOB":
      return "OOB";
    case "Rejection":
      return "Rejection";
    default:
      return "Any";
  }
}
