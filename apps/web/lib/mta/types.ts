/**
 * MTA Direct Injection Types
 *
 * These types define the message format for direct HTTP injection to the MTA.
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
 * Email attachment for MTA injection
 * Supports both S3 keys (for MTA to fetch) and inline base64 data
 */
export interface EmailAttachment {
  s3_key?: string;
  file_name: string;
  content_type: string;
  content_id?: string;
  data?: string;
  base64?: boolean;
}

/**
 * Email message payload for MTA injection
 *
 * This is the message format expected by the MTA HTTP injection endpoint.
 * The control plane has already processed templates - content is ready to send.
 */
export interface EmailMessage {
  id: string;
  tenant_id: string;
  broadcast_id: string;
  contact_id: string;
  pool: "marketing" | "transactional";
  recipient: EmailRecipient;
  sender: EmailSender;
  reply_to: EmailAddress;
  subject: string;
  preview_text: string;
  html_body: string;
  text_body: string;
  attachments: EmailAttachment[];
  headers: Record<string, string>;
  metadata: Record<string, string>;
  track_opens: boolean;
  track_clicks: boolean;
}

/**
 * Result of a single email injection
 */
export interface InjectionResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Result of a batch email injection
 */
export interface BatchInjectionResult {
  total: number;
  successful: number;
  failed: number;
  results: InjectionResult[];
}

/**
 * MTA injection configuration options
 */
export interface MtaInjectionOptions {
  url: string;
  timeoutMs: number;
  retryAttempts: number;
  batchSize: number;
  secretKey: string;
}
