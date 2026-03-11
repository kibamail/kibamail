/**
 * MTA Event Types
 *
 * Types for email events received from the MTA via webhooks.
 * These match the event format published by KumoMTA.
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
 * Email event from MTA webhook
 *
 * This is the message format received from the MTA webhook endpoint.
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
  /** Contact ID (null for sandbox broadcasts) */
  contact_id: string | null;
  /** SMTP response details */
  response: EventResponse;
  /** Bounce classification (for bounce events) */
  bounce_classification: string;
  /** Event timestamp (RFC3339) */
  timestamp: string;
  /** KumoMTA node ID */
  node_id: string;

  // KumoMTA standard fields
  /** Queue name (destination domain) */
  queue: string;
  /** MX site name (empty on Reception) */
  site_name: string;
  /** Message size in bytes */
  size: number | null;
  /** Number of delivery attempts */
  num_attempts: number | null;
  /** Peer address hostname */
  peer_address_name: string;
  /** Peer address IP */
  peer_address_addr: string;
  /** Egress pool name (null on Reception) */
  egress_pool: string;
  /** Egress source name (null on Reception) */
  egress_source: string;
  /** Delivery protocol (null on Reception) */
  delivery_protocol: string;
  /** Reception protocol (null on non-Reception) */
  reception_protocol: string;

  // Application metadata (from X-Kibamail-* headers)
  /** Sending domain ID */
  sending_domain_id: string;
  /** Sender identity ID */
  sender_identity_id: string;
  /** Whether click tracking was enabled */
  click_tracking_enabled: boolean | null;
  /** Whether open tracking was enabled */
  open_tracking_enabled: boolean | null;
  /** Sender email (from SMTP injection metadata) */
  from_email: string;
  /** Email subject (from SMTP injection metadata) */
  subject: string;
}

/**
 * Batch of events for bulk insertion
 */
export interface EventBatch {
  events: EmailEvent[];
}

/**
 * Map MTA event types to Prisma EventType enum values
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
