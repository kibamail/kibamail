/**
 * Email Parser Utility
 *
 * Parses raw RFC822 email content into a structured format.
 * Used for processing inbound emails in the inbox feature.
 */

import { simpleParser, type ParsedMail } from "mailparser";

/**
 * Parsed email structure
 */
export interface ParsedEmail {
  /** Email subject */
  subject: string;
  /** Sender email address */
  fromEmail: string;
  /** Sender display name */
  fromName?: string;
  /** Primary recipient email address */
  toEmail: string;
  /** Primary recipient display name */
  toName?: string;
  /** Plain text body */
  textBody?: string;
  /** HTML body */
  htmlBody?: string;
  /** RFC822 Message-ID header */
  messageId?: string;
  /** In-Reply-To header */
  inReplyTo?: string;
  /** References header (space-separated message IDs) */
  references?: string;
  /** Email date */
  date?: Date;
  /** Parsed attachments */
  attachments: ParsedAttachment[];
}

/**
 * Parsed attachment structure
 */
export interface ParsedAttachment {
  /** Original filename */
  filename: string;
  /** MIME content type */
  contentType: string;
  /** Size in bytes */
  size: number;
  /** File content as buffer */
  content: Buffer;
  /** Content-ID for inline attachments */
  contentId?: string;
  /** Whether this is an inline attachment */
  isInline: boolean;
}

/**
 * Parse raw RFC822 email content
 *
 * @param rawEmail - Raw email content as string or buffer
 * @returns Parsed email structure
 *
 * @example
 * ```ts
 * const rawEmail = await downloadPrivateFile("inbox/workspace/date/message.eml");
 * const parsed = await parseEmail(rawEmail.body);
 * console.log(parsed.subject, parsed.fromEmail);
 * ```
 */
export async function parseEmail(rawEmail: string | Buffer): Promise<ParsedEmail> {
  const parsed: ParsedMail = await simpleParser(rawEmail);

  // Extract from address
  const fromAddress = Array.isArray(parsed.from?.value)
    ? parsed.from.value[0]
    : parsed.from?.value;

  // Extract to address (first recipient)
  const toAddresses = parsed.to;
  const toValue = Array.isArray(toAddresses)
    ? toAddresses[0]
    : toAddresses;
  const toAddress = toValue && "value" in toValue
    ? (Array.isArray(toValue.value) ? toValue.value[0] : toValue.value)
    : undefined;

  // Process attachments
  const attachments: ParsedAttachment[] = (parsed.attachments || []).map((att) => ({
    filename: att.filename || "unnamed",
    contentType: att.contentType,
    size: att.size,
    content: att.content,
    contentId: att.contentId?.replace(/^<|>$/g, ""), // Strip angle brackets
    isInline: att.contentDisposition === "inline",
  }));

  // Process references header (can be string or array)
  let references: string | undefined;
  if (parsed.references) {
    if (Array.isArray(parsed.references)) {
      references = parsed.references.join(" ");
    } else {
      references = parsed.references;
    }
  }

  return {
    subject: parsed.subject || "(No Subject)",
    fromEmail: fromAddress?.address || "",
    fromName: fromAddress?.name,
    toEmail: toAddress?.address || "",
    toName: toAddress?.name,
    textBody: parsed.text,
    htmlBody: parsed.html || undefined,
    messageId: parsed.messageId,
    inReplyTo: parsed.inReplyTo,
    references,
    date: parsed.date,
    attachments,
  };
}

/**
 * Extract email address from a formatted address string
 *
 * @param formatted - Formatted address like "Name <email@example.com>"
 * @returns Just the email address
 *
 * @example
 * ```ts
 * extractEmailAddress("John Doe <john@example.com>") // "john@example.com"
 * extractEmailAddress("john@example.com") // "john@example.com"
 * ```
 */
export function extractEmailAddress(formatted: string): string {
  const match = formatted.match(/<([^>]+)>/);
  return match ? match[1] : formatted.trim();
}

/**
 * Extract display name from a formatted address string
 *
 * @param formatted - Formatted address like "Name <email@example.com>"
 * @returns The display name, or undefined if not present
 *
 * @example
 * ```ts
 * extractDisplayName("John Doe <john@example.com>") // "John Doe"
 * extractDisplayName("john@example.com") // undefined
 * ```
 */
export function extractDisplayName(formatted: string): string | undefined {
  const match = formatted.match(/^(.+?)\s*<[^>]+>$/);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : undefined;
}
