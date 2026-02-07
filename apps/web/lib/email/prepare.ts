/**
 * Email Preparation
 *
 * Prepares emails for sending by:
 * - Rendering broadcast content to HTML
 * - Substituting variables (contact name, unsubscribe URL, etc.)
 * - Applying tracking (links and pixels)
 * - Generating message IDs
 */

import type { SenderIdentity, SendingDomain } from "@prisma/client";
import type { ContactPropertyValue } from "@/lib/contacts/properties";
import {
  type BroadcastDocument,
  type BroadcastStyles,
  renderBroadcastToHtml,
} from "@/lib/broadcast-renderer";
import type { EmailMessage } from "@/lib/mta";
import { generateMessageIdForDomain } from "./message-id";
import { htmlToPlainText } from "./html-to-text";
import { applyTracking } from "./tracking";

/**
 * Contact data needed for email personalization
 */
export interface EmailContact {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  properties?: Record<string, ContactPropertyValue>;
  /** Transient variables from API request, override contact properties */
  transientVariables?: Record<string, string | number>;
}

/**
 * Email-only recipient (no contact record required)
 * Used for create-and-send API with emails array
 */
export interface EmailOnlyContact {
  email: string;
  variables?: Record<string, string | number>;
}

/**
 * Broadcast data needed for email preparation
 */
export interface EmailBroadcast {
  id: string;
  workspaceId: string;
  emailContent: {
    subject: string;
    previewText?: string | null;
    contentJson?: unknown;
    contentHtml?: string | null;
    contentText?: string | null;
    styles?: BroadcastStyles | null;
  };
  senderIdentity: SenderIdentity & {
    sendingDomain: SendingDomain;
  };
  sendingDomain: SendingDomain;
  trackOpens?: boolean | null;
  trackClicks?: boolean | null;
  /** Reply-to local part (e.g., "frantz" in frantz@domain.com) */
  replyToLocalPart: string;
  /** Reply-to domain (e.g., "domain.com") */
  replyToDomain: string;
  /** Whether inbox is enabled for this sending domain */
  inboxEnabled: boolean;
}

/**
 * Result of preparing an email for a single recipient
 */
export interface PreparedEmail {
  // Identifiers
  emailSendId: string;
  messageId: string;
  workspaceId: string;
  broadcastId: string;
  contactId: string;
  sendingDomainId: string;
  senderIdentityId: string;

  // Recipient
  recipientEmail: string;
  recipientFirstName: string;
  recipientLastName: string;

  // Sender
  senderEmail: string;
  senderName: string;
  senderDomain: string;
  envelopeSender: string;
  replyTo: string;

  // Content
  subject: string;
  previewText: string;
  htmlBody: string;
  textBody: string;

  // Headers
  headers: Record<string, string>;

  // Tracking
  trackOpens: boolean;
  trackClicks: boolean;
  links: Array<{ original: string; tracking: string }>;
}

/**
 * Build the "from" address string
 *
 * @param senderIdentity - The sender identity
 * @param domain - The sending domain name
 * @returns Formatted from address (e.g., "John Doe <john@example.com>")
 */
function _buildFromAddress(
  senderIdentity: SenderIdentity,
  domain: string,
): string {
  const email = `${senderIdentity.email}@${domain}`;
  if (senderIdentity.name) {
    return `${senderIdentity.name} <${email}>`;
  }
  return email;
}

/**
 * Build the reply-to email address
 *
 * When inbox is enabled, uses plus-addressing to include the emailSendId
 * for tracking replies: sender+emailSendId@domain.com
 *
 * @param localPart - Reply-to local part (e.g., "frantz")
 * @param domain - Reply-to domain (e.g., "domain.com")
 * @param emailSendId - Unique email send ID for correlation
 * @param inboxEnabled - Whether inbox is enabled for the sending domain
 * @returns Reply-to email address
 */
function buildReplyToAddress(
  localPart: string,
  domain: string,
  emailSendId: string,
  inboxEnabled: boolean,
): string {
  if (inboxEnabled) {
    return `${localPart}+${emailSendId}@${domain}`;
  }
  return `${localPart}@${domain}`;
}

/**
 * Build personalization variables for a contact
 *
 * Priority order (highest to lowest):
 * 1. Transient variables (per-email, from API request)
 * 2. Custom properties (from contact record)
 * 3. Built-in variables (email, firstName, lastName, URLs)
 *
 * @param contact - The contact
 * @param broadcast - The broadcast
 * @param customProperties - Optional custom contact properties for personalization
 * @returns Variables map for template substitution
 */
function buildVariables(
  contact: EmailContact,
  broadcast: EmailBroadcast,
  customProperties?: Record<string, ContactPropertyValue>,
): Record<string, string> {
  const domain = broadcast.sendingDomain.name;
  const trackingDomain = `${broadcast.sendingDomain.trackingSubDomain}.${domain}`;

  // Start with built-in variables
  const variables: Record<string, string> = {
    email: contact.email,
    firstName: contact.firstName || "",
    first_name: contact.firstName || "",
    lastName: contact.lastName || "",
    last_name: contact.lastName || "",
    unsubscribe_url: `https://${trackingDomain}/u/${contact.id}/${broadcast.id}`,
    preferences_url: `https://${trackingDomain}/p/${contact.id}`,
    view_in_browser_url: `https://${trackingDomain}/v/${broadcast.id}/${contact.id}`,
  };

  // Add custom properties from contact record (lower priority)
  if (customProperties) {
    for (const [key, value] of Object.entries(customProperties)) {
      variables[`contact.${key}`] = value != null ? String(value) : "";
    }
  }

  // Override with transient variables from API request (highest priority)
  if (contact.transientVariables) {
    for (const [key, value] of Object.entries(contact.transientVariables)) {
      // Transient variables can be accessed both with and without contact. prefix
      variables[key] = String(value);
      variables[`contact.${key}`] = String(value);
    }
  }

  return variables;
}

/**
 * Build RFC 8058 List-Unsubscribe headers for one-click unsubscribe
 *
 * Gmail and Yahoo require these headers for bulk senders (Feb 2024+).
 * Format:
 *   List-Unsubscribe: <https://...>, <mailto:...>
 *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
 *
 * @param unsubscribeUrl - The HTTPS unsubscribe URL
 * @returns Headers object with List-Unsubscribe and List-Unsubscribe-Post
 */
function buildListUnsubscribeHeaders(
  unsubscribeUrl: string,
): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Substitute variables in text
 *
 * Replaces {{variable_name}} patterns with actual values.
 *
 * @param text - Text with variable placeholders
 * @param variables - Variables to substitute
 * @returns Text with variables replaced
 */
function substituteVariables(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varName) => {
    return variables[varName] ?? "";
  });
}

/**
 * Prepare a single email for sending
 *
 * @param contact - The recipient contact
 * @param broadcast - The broadcast data
 * @param options - Tracking options
 * @returns Prepared email ready for injection
 */
async function prepareEmail(
  contact: EmailContact,
  broadcast: EmailBroadcast,
): Promise<PreparedEmail> {
  const domain = broadcast.sendingDomain.name;
  const trackingDomain = `${broadcast.sendingDomain.trackingSubDomain}.${domain}`;

  const { id: emailSendId, messageId } = generateMessageIdForDomain(domain);
  const variables = buildVariables(contact, broadcast, contact.properties);

  // Tracking settings
  const trackOpens = broadcast.trackOpens ?? true;
  const trackClicks = broadcast.trackClicks ?? true;

  // Render HTML content
  let htmlBody: string;
  if (broadcast.emailContent.contentJson) {
    // Get styles from email content (if stored)
    const styles = broadcast.emailContent.styles ?? {};

    htmlBody = await renderBroadcastToHtml(
      broadcast.emailContent.contentJson as BroadcastDocument,
      { variables },
      styles,
    );
  } else if (broadcast.emailContent.contentHtml) {
    htmlBody = substituteVariables(
      broadcast.emailContent.contentHtml,
      variables,
    );
  } else {
    throw new Error(`Broadcast ${broadcast.id} has no content`);
  }

  // Apply tracking (link rewriting, open pixel)
  const trackingResult = applyTracking(htmlBody, trackingDomain, emailSendId, {
    clickTracking: trackClicks,
    openTracking: trackOpens,
  });

  // Prepare plain text version (use provided text or auto-generate from HTML)
  let textBody: string;
  if (broadcast.emailContent.contentText) {
    textBody = substituteVariables(
      broadcast.emailContent.contentText,
      variables,
    );
  } else {
    textBody = htmlToPlainText(trackingResult.html);
  }

  // Build envelope sender for bounce handling
  const envelopeSender = `bounces+${emailSendId}@${broadcast.sendingDomain.returnPathSubDomain}.${domain}`;

  // Build List-Unsubscribe headers (RFC 8058)
  const headers = buildListUnsubscribeHeaders(variables.unsubscribe_url);

  // Substitute variables in subject and preview text
  const subject = substituteVariables(
    broadcast.emailContent.subject,
    variables,
  );
  const previewText = broadcast.emailContent.previewText
    ? substituteVariables(broadcast.emailContent.previewText, variables)
    : "";

  // Build reply-to with inbox tracking if enabled
  const replyTo = buildReplyToAddress(
    broadcast.replyToLocalPart,
    broadcast.replyToDomain,
    emailSendId,
    broadcast.inboxEnabled,
  );

  return {
    // Identifiers
    emailSendId,
    messageId,
    workspaceId: broadcast.workspaceId,
    broadcastId: broadcast.id,
    contactId: contact.id,
    sendingDomainId: broadcast.sendingDomain.id,
    senderIdentityId: broadcast.senderIdentity.id,

    // Recipient
    recipientEmail: contact.email,
    recipientFirstName: contact.firstName ?? "",
    recipientLastName: contact.lastName ?? "",

    // Sender
    senderEmail: broadcast.senderIdentity.email,
    senderName: broadcast.senderIdentity.name ?? "",
    senderDomain: domain,
    envelopeSender,
    replyTo,

    // Content
    subject,
    previewText,
    htmlBody: trackingResult.html,
    textBody,

    // Headers
    headers,

    // Tracking
    trackOpens,
    trackClicks,
    links: trackingResult.links,
  };
}

/**
 * Prepare multiple emails for batch sending
 *
 * @param contacts - Array of recipient contacts
 * @param broadcast - The broadcast data
 * @returns Array of prepared emails
 */
export async function prepareEmailBatch(
  contacts: EmailContact[],
  broadcast: EmailBroadcast,
): Promise<PreparedEmail[]> {
  const preparedEmails: PreparedEmail[] = [];

  for (const contact of contacts) {
    const prepared = await prepareEmail(contact, broadcast);
    preparedEmails.push(prepared);
  }

  return preparedEmails;
}

/**
 * Convert prepared emails to MTA injection message format
 *
 * Creates the message payload expected by the MTA HTTP injection endpoint.
 * Content is passed directly without intermediate storage.
 *
 * @param preparedEmails - Array of prepared emails
 * @returns Array of email messages ready for injection
 */
export function convertToMtaMessages(
  preparedEmails: PreparedEmail[],
): EmailMessage[] {
  return preparedEmails.map((prepared) => {
    // Build recipient name from first and last name
    const recipientName = [
      prepared.recipientFirstName,
      prepared.recipientLastName,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: prepared.emailSendId,
      tenant_id: prepared.workspaceId,
      broadcast_id: prepared.broadcastId,
      contact_id: prepared.contactId,
      pool: "marketing" as const,
      recipient: {
        email: prepared.recipientEmail,
        name: recipientName,
      },
      sender: {
        email: prepared.senderEmail,
        name: prepared.senderName,
        domain: prepared.senderDomain,
      },
      reply_to: {
        email: prepared.replyTo,
        name: "",
      },
      subject: prepared.subject,
      preview_text: prepared.previewText,
      html_body: prepared.htmlBody,
      text_body: prepared.textBody,
      attachments: [],
      headers: prepared.headers,
      metadata: {
        message_id: prepared.messageId,
        envelope_sender: prepared.envelopeSender,
      },
      track_opens: prepared.trackOpens,
      track_clicks: prepared.trackClicks,
      sending_domain_id: prepared.sendingDomainId,
      sender_identity_id: prepared.senderIdentityId,
    };
  });
}

// ============================================================================
// Email-Only Preparation (no contact records required)
// ============================================================================

/**
 * Result of preparing an email-only send (no contact required)
 */
export interface PreparedEmailOnly {
  // Identifiers
  emailSendId: string;
  messageId: string;
  workspaceId: string;
  broadcastId: string;
  sendingDomainId: string;
  senderIdentityId: string;

  // Recipient
  recipientEmail: string;

  // Sender
  senderEmail: string;
  senderName: string;
  senderDomain: string;
  envelopeSender: string;
  replyTo: string;

  // Content
  subject: string;
  previewText: string;
  htmlBody: string;
  textBody: string;

  // Headers
  headers: Record<string, string>;

  // Tracking
  trackOpens: boolean;
  trackClicks: boolean;
  links: Array<{ original: string; tracking: string }>;

  // Variables (stored in BroadcastSend for personalization tracking)
  variables?: Record<string, string | number>;
}

/**
 * Build personalization variables for email-only recipients
 *
 * Uses sendingId-based URLs for unsubscribe since there's no contactId.
 * The sendingId is generated before this function is called.
 *
 * @param email - Recipient email address
 * @param broadcast - The broadcast data
 * @param emailSendId - The unique send ID (used for unsubscribe URL)
 * @param customVariables - Optional custom variables from API request
 * @returns Variables map for template substitution
 */
function buildVariablesForEmailOnly(
  email: string,
  broadcast: EmailBroadcast,
  emailSendId: string,
  customVariables?: Record<string, string | number>,
): Record<string, string> {
  const domain = broadcast.sendingDomain.name;
  const trackingDomain = `${broadcast.sendingDomain.trackingSubDomain}.${domain}`;

  // Start with built-in variables (no firstName/lastName for email-only)
  const variables: Record<string, string> = {
    email,
    firstName: "",
    first_name: "",
    lastName: "",
    last_name: "",
    // Use sendingId-based URL for unsubscribe (different from contact-based)
    unsubscribe_url: `https://${trackingDomain}/us/${emailSendId}`,
    preferences_url: "", // No preferences page for email-only (no contact)
    view_in_browser_url: `https://${trackingDomain}/vs/${emailSendId}`,
  };

  // Override with custom variables from API request
  if (customVariables) {
    for (const [key, value] of Object.entries(customVariables)) {
      variables[key] = String(value);
      variables[`contact.${key}`] = String(value);
    }
  }

  return variables;
}

/**
 * Prepare a single email for email-only sending (no contact record)
 *
 * @param recipient - The email-only recipient
 * @param broadcast - The broadcast data
 * @returns Prepared email ready for injection
 */
async function prepareEmailOnly(
  recipient: EmailOnlyContact,
  broadcast: EmailBroadcast,
): Promise<PreparedEmailOnly> {
  const domain = broadcast.sendingDomain.name;
  const trackingDomain = `${broadcast.sendingDomain.trackingSubDomain}.${domain}`;

  // Generate IDs first so we can use sendingId in unsubscribe URL
  const { id: emailSendId, messageId } = generateMessageIdForDomain(domain);
  const variables = buildVariablesForEmailOnly(
    recipient.email,
    broadcast,
    emailSendId,
    recipient.variables,
  );

  // Tracking settings
  const trackOpens = broadcast.trackOpens ?? true;
  const trackClicks = broadcast.trackClicks ?? true;

  // Render HTML content
  let htmlBody: string;
  if (broadcast.emailContent.contentJson) {
    const styles = broadcast.emailContent.styles ?? {};
    htmlBody = await renderBroadcastToHtml(
      broadcast.emailContent.contentJson as BroadcastDocument,
      { variables },
      styles,
    );
  } else if (broadcast.emailContent.contentHtml) {
    htmlBody = substituteVariables(
      broadcast.emailContent.contentHtml,
      variables,
    );
  } else {
    throw new Error(`Broadcast ${broadcast.id} has no content`);
  }

  // Apply tracking (link rewriting, open pixel)
  const trackingResult = applyTracking(htmlBody, trackingDomain, emailSendId, {
    clickTracking: trackClicks,
    openTracking: trackOpens,
  });

  // Prepare plain text version
  let textBody: string;
  if (broadcast.emailContent.contentText) {
    textBody = substituteVariables(broadcast.emailContent.contentText, variables);
  } else {
    textBody = htmlToPlainText(trackingResult.html);
  }

  // Build envelope sender for bounce handling
  const envelopeSender = `bounces+${emailSendId}@${broadcast.sendingDomain.returnPathSubDomain}.${domain}`;

  // Build List-Unsubscribe headers (RFC 8058)
  const headers = buildListUnsubscribeHeaders(variables.unsubscribe_url);

  // Substitute variables in subject and preview text
  const subject = substituteVariables(broadcast.emailContent.subject, variables);
  const previewText = broadcast.emailContent.previewText
    ? substituteVariables(broadcast.emailContent.previewText, variables)
    : "";

  // Build reply-to (no inbox tracking for email-only sends)
  const replyTo = `${broadcast.replyToLocalPart}@${broadcast.replyToDomain}`;

  return {
    emailSendId,
    messageId,
    workspaceId: broadcast.workspaceId,
    broadcastId: broadcast.id,
    sendingDomainId: broadcast.sendingDomain.id,
    senderIdentityId: broadcast.senderIdentity.id,
    recipientEmail: recipient.email,
    senderEmail: broadcast.senderIdentity.email,
    senderName: broadcast.senderIdentity.name ?? "",
    senderDomain: domain,
    envelopeSender,
    replyTo,
    subject,
    previewText,
    htmlBody: trackingResult.html,
    textBody,
    headers,
    trackOpens,
    trackClicks,
    links: trackingResult.links,
    variables: recipient.variables,
  };
}

/**
 * Prepare multiple email-only recipients for batch sending
 *
 * @param recipients - Array of email-only recipients
 * @param broadcast - The broadcast data
 * @returns Array of prepared emails
 */
export async function prepareEmailOnlyBatch(
  recipients: EmailOnlyContact[],
  broadcast: EmailBroadcast,
): Promise<PreparedEmailOnly[]> {
  const preparedEmails: PreparedEmailOnly[] = [];

  for (const recipient of recipients) {
    const prepared = await prepareEmailOnly(recipient, broadcast);
    preparedEmails.push(prepared);
  }

  return preparedEmails;
}

/**
 * Convert email-only prepared emails to MTA injection message format
 *
 * @param preparedEmails - Array of prepared email-only emails
 * @returns Array of email messages ready for injection
 */
export function convertEmailOnlyToMtaMessages(
  preparedEmails: PreparedEmailOnly[],
): EmailMessage[] {
  return preparedEmails.map((prepared) => ({
    id: prepared.emailSendId,
    tenant_id: prepared.workspaceId,
    broadcast_id: prepared.broadcastId,
    contact_id: "", // No contact for email-only sends
    pool: "marketing" as const,
    recipient: {
      email: prepared.recipientEmail,
      name: "", // No name for email-only recipients
    },
    sender: {
      email: prepared.senderEmail,
      name: prepared.senderName,
      domain: prepared.senderDomain,
    },
    reply_to: {
      email: prepared.replyTo,
      name: "",
    },
    subject: prepared.subject,
    preview_text: prepared.previewText,
    html_body: prepared.htmlBody,
    text_body: prepared.textBody,
    attachments: [],
    headers: prepared.headers,
    metadata: {
      message_id: prepared.messageId,
      envelope_sender: prepared.envelopeSender,
    },
    track_opens: prepared.trackOpens,
    track_clicks: prepared.trackClicks,
    sending_domain_id: prepared.sendingDomainId,
    sender_identity_id: prepared.senderIdentityId,
  }));
}
