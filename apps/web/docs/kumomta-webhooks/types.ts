/**
 * KumoMTA Webhook Types
 *
 * TypeScript definitions for KumoMTA webhook payloads.
 * Use these types when implementing the control plane's NATS consumer.
 */

/**
 * Record types that KumoMTA can send
 */
export type RecordType =
  | "Reception" // Message received via SMTP/HTTP
  | "Delivery" // Successful delivery
  | "Bounce" // Permanent failure (hard bounce)
  | "TransientFailure" // Temporary failure (soft bounce)
  | "Expiration" // Message expired from queue
  | "AdminBounce" // Administratively bounced
  | "OOB" // Out-of-band bounce (DSN)
  | "Feedback" // Spam complaint (FBL)
  | "Rejection"; // Inbound rejection

/**
 * Bounce classifications from KumoMTA
 */
export type BounceClassification =
  | "InvalidRecipient" // User doesn't exist (5.1.1)
  | "BadDomain" // Domain doesn't exist (5.1.10)
  | "InactiveMailbox" // Account disabled (5.2.1)
  | "QuotaIssues" // Mailbox full (5.2.2)
  | "DNSFailure" // DNS lookup failed
  | "SpamBlock" // Blocked as spam source
  | "SpamContent" // Content flagged as spam
  | "SpamRelated" // General spam rejection
  | "PolicyRelated" // Policy rejection
  | "AuthenticationFailed" // SPF/DKIM/DMARC failure
  | "TransientFailure" // Temporary congestion
  | "MessageExpired" // Exceeded queue lifetime
  | "NoAnswerFromHost" // Remote host timeout
  | "BadConnection" // Connection issues
  | "BadConfiguration" // Remote misconfiguration
  | "ProtocolErrors" // SMTP protocol errors
  | "ContentRelated" // Content rejected
  | "InvalidSender" // Invalid sender domain
  | "RelayDenied" // Relay not allowed
  | "RoutingErrors" // Mail routing issues
  | "ProhibitedAttachment" // Attachment blocked
  | "TooManyRecipients" // Recipient limit
  | "AutoReply" // Auto-reply detected
  | "Subscribe" // Subscribe request
  | "Unsubscribe" // Unsubscribe request
  | "ChallengeResponse" // C/R probe
  | "VirusRelated" // Virus detected
  | "RelayingIssues" // Relay issues
  | "Uncategorized"; // Default/unknown

/**
 * Enhanced SMTP status code (X.Y.Z format)
 */
export interface EnhancedStatusCode {
  class: number; // 2, 4, or 5
  subject: number; // 0-999
  detail: number; // 0-999
}

/**
 * SMTP response from remote server
 */
export interface WebhookResponse {
  code: number; // SMTP code (250, 450, 550, etc.)
  enhanced_code?: EnhancedStatusCode;
  content: string; // Response message
  command?: string | null; // SMTP command (RCPT TO, DATA, etc.)
}

/**
 * Remote server address info
 */
export interface PeerAddress {
  name: string; // Hostname or EHLO
  addr: string; // IP:port
}

/**
 * Source address for outbound connection
 */
export interface SourceAddress {
  address: string; // IP:port
  server?: string | null; // Proxy server if used
  protocol?: string | null; // "haproxy" or "socks5"
}

/**
 * Remote MTA info (for DSN/FBL reports)
 */
export interface RemoteMta {
  mta_type: string; // Usually "dns"
  name: string; // MTA hostname
}

/**
 * ARF Feedback Report (RFC 5965)
 * Present when type is "Feedback"
 */
export interface FeedbackReport {
  feedback_type: string; // "abuse", "fraud", etc.
  user_agent: string; // Reporting tool
  version: string; // ARF version
  arrival_date?: string | null; // ISO 8601
  incidents?: number | null;
  original_envelope_id?: string | null;
  original_mail_from?: string | null;
  reporting_mta?: RemoteMta | null;
  source_ip?: string | null;
  authentication_results: string[];
  original_rcpto_to: string[];
  reported_domain: string[];
  reported_uri: string[];
  extensions: Record<string, string[]>;
  original_message?: string | null;
  /**
   * Kibamail trace data extracted from X-KumoRef header
   * Contains tenant_id, broadcast_id, contact_id
   */
  supplemental_trace?: Record<string, unknown> | null;
}

/**
 * Custom metadata attached to the message
 * Kibamail injects tenant_id, broadcast_id, contact_id
 */
export interface WebhookMeta {
  tenant_id?: string;
  broadcast_id?: string;
  contact_id?: string;
  campaign?: string;
  list_id?: string;
  [key: string]: unknown;
}

/**
 * KumoMTA Webhook Record
 * This is the main webhook payload structure
 */
export interface KumoMTAWebhook {
  /** Record type */
  type: RecordType;

  /** Message spool ID */
  id: string;

  /** Envelope sender (MAIL FROM) */
  sender: string;

  /** Envelope recipient(s) - can be string or array */
  recipient: string | string[];

  /** Destination queue name (domain) */
  queue: string;

  /** MX site for delivery */
  site: string;

  /** Message size in bytes */
  size: number;

  /** SMTP response */
  response: WebhookResponse;

  /** Remote server address */
  peer_address?: PeerAddress | null;

  /** Unix timestamp of event */
  timestamp: number;

  /** RFC 3339 timestamp of event */
  event_time?: string;

  /** Unix timestamp of message creation */
  created: number;

  /** RFC 3339 timestamp of message creation */
  created_time?: string;

  /** Number of delivery attempts */
  num_attempts: number;

  /** Bounce classification */
  bounce_classification: BounceClassification;

  /** Egress pool name */
  egress_pool?: string | null;

  /** Egress source IP */
  egress_source?: string | null;

  /** Local source address */
  source_address?: SourceAddress | null;

  /** Feedback report (only for type=Feedback) */
  feedback_report?: FeedbackReport | null;

  /** Custom metadata */
  meta: WebhookMeta;

  /** Captured message headers */
  headers: Record<string, string>;

  /** Delivery protocol (ESMTP, Maildir, Lua) */
  delivery_protocol?: string | null;

  /** Reception protocol (ESMTP, HTTP) */
  reception_protocol?: string | null;

  /** KumoMTA node UUID */
  nodeid: string;

  /** TLS cipher used */
  tls_cipher?: string | null;

  /** TLS version (TLSv1.2, TLSv1.3) */
  tls_protocol_version?: string | null;

  /** Peer certificate subject names */
  tls_peer_subject_name?: string[] | null;

  /** Provider name for site grouping */
  provider_name?: string | null;

  /** Session UUID for correlation */
  session_id?: string | null;
}

/**
 * Helper to check if a record is a bounce (permanent failure)
 */
export function isBounce(record: KumoMTAWebhook): boolean {
  return record.type === "Bounce" || record.type === "AdminBounce";
}

/**
 * Helper to check if a record is a soft bounce (temporary failure)
 */
export function isSoftBounce(record: KumoMTAWebhook): boolean {
  return record.type === "TransientFailure" || record.type === "Expiration";
}

/**
 * Helper to check if a record is a spam complaint
 */
export function isComplaint(record: KumoMTAWebhook): boolean {
  return record.type === "Feedback";
}

/**
 * Helper to check if a record indicates successful delivery
 */
export function isDelivery(record: KumoMTAWebhook): boolean {
  return record.type === "Delivery";
}

/**
 * Helper to determine if contact should be suppressed
 * Returns true for hard bounces and spam complaints
 */
export function shouldSuppress(record: KumoMTAWebhook): boolean {
  // Always suppress on spam complaint
  if (record.type === "Feedback") {
    return true;
  }

  // Suppress on hard bounce with permanent classifications
  if (record.type === "Bounce" || record.type === "AdminBounce") {
    const permanentClassifications: BounceClassification[] = [
      "InvalidRecipient",
      "BadDomain",
      "InactiveMailbox",
      "InvalidSender",
    ];
    return permanentClassifications.includes(record.bounce_classification);
  }

  return false;
}

/**
 * Extract Kibamail identifiers from webhook
 */
export function extractIdentifiers(record: KumoMTAWebhook): {
  tenantId: string | undefined;
  broadcastId: string | undefined;
  contactId: string | undefined;
} {
  // Try meta first
  if (record.meta.tenant_id) {
    return {
      tenantId: record.meta.tenant_id,
      broadcastId: record.meta.broadcast_id,
      contactId: record.meta.contact_id,
    };
  }

  // For feedback reports, check supplemental_trace
  if (record.feedback_report?.supplemental_trace) {
    const trace = record.feedback_report.supplemental_trace as WebhookMeta;
    return {
      tenantId: trace.tenant_id,
      broadcastId: trace.broadcast_id,
      contactId: trace.contact_id,
    };
  }

  return {
    tenantId: undefined,
    broadcastId: undefined,
    contactId: undefined,
  };
}
