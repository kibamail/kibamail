/**
 * Message ID Generation
 *
 * Generates unique message IDs for email tracking.
 * The format follows RFC 5322 for Message-ID headers.
 */

import { randomBytes } from "node:crypto";

/**
 * Generate a unique email send ID
 *
 * Format: es_<timestamp>_<random>
 * - es: email send prefix
 * - timestamp: current timestamp in base36
 * - random: 12 random bytes in hex
 *
 * @returns Unique email send ID
 */
function generateEmailSendId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(12).toString("hex");
  return `es_${timestamp}_${random}`;
}

/**
 * Generate a unique Message-ID header value for a domain
 *
 * Format: <random@domain>
 * This follows RFC 5322 Message-ID format.
 *
 * @param domain - The sending domain
 * @returns Object with id (internal tracking ID) and messageId (RFC 5322 header)
 */
export function generateMessageIdForDomain(domain: string): {
  id: string;
  messageId: string;
} {
  const id = generateEmailSendId();
  const messageId = `<${id}@${domain}>`;

  return { id, messageId };
}
