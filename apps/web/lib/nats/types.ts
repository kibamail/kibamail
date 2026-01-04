/**
 * NATS Message Types
 *
 * These types match the email-agent's expected message format.
 * @see apps/email-agent/internal/domain/email.go
 */

/**
 * Email recipient information
 */
export interface EmailRecipient {
  email: string;
  name: string;
}

/**
 * Email sender information
 */
export interface EmailSender {
  email: string;
  name: string;
  domain: string;
}

/**
 * Simple email address with optional name
 */
export interface EmailAddress {
  email: string;
  name: string;
}

/**
 * Email attachment stored in S3
 */
export interface EmailAttachment {
  s3_key: string;
  file_name: string;
  content_type: string;
  content_id?: string;
}

/**
 * Email message payload for NATS
 *
 * This is the message format expected by the email-agent.
 * The control plane has already processed templates - content is ready to send.
 */
export interface EmailMessage {
  id: string;
  tenant_id: string;
  broadcast_id: string;
  contact_id: string;
  recipient: EmailRecipient;
  sender: EmailSender;
  reply_to: EmailAddress;
  subject: string;
  preview_text: string;
  content_key: string;
  attachments: EmailAttachment[];
  metadata: Record<string, string>;
  track_opens: boolean;
  track_clicks: boolean;
}

/**
 * NATS JetStream publish acknowledgment
 */
export interface PublishAck {
  stream: string;
  seq: number;
  duplicate: boolean;
}

/**
 * NATS connection options
 *
 * Supports two authentication methods:
 * 1. NKey authentication (preferred for production): Provide nkeySeed
 * 2. Password authentication (for development): Provide user and password
 */
export interface NatsConnectionOptions {
  url: string;
  tlsCa: string;
  /** Client certificate for mTLS (base64 encoded) */
  tlsCert?: string;
  /** Client private key for mTLS (base64 encoded) */
  tlsKey?: string;
  /** NKey seed for authentication (starts with 'SU' for user seed) */
  nkeySeed?: string;
  /** Username for password-based authentication */
  user?: string;
  /** Password for password-based authentication */
  password?: string;
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;
}
