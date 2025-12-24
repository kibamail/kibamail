/**
 * Email Preparation
 *
 * Prepares emails for sending by:
 * - Rendering broadcast content to HTML
 * - Substituting variables (contact name, unsubscribe URL, etc.)
 * - Applying tracking (links and pixels)
 * - Generating message IDs
 */

import type { Contact, SendingDomain, SenderIdentity } from "@prisma/client";
import { renderBroadcastToHtml, type BroadcastDocument } from "@/lib/broadcast-renderer";
import { applyTracking } from "./tracking";
import { generateMessageIdForDomain } from "./message-id";

/**
 * Contact data needed for email personalization
 */
export interface EmailContact {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Broadcast data needed for email preparation
 */
export interface EmailBroadcast {
  id: string;
  emailContent: {
    subject: string;
    contentJson?: unknown;
    contentHtml?: string | null;
  };
  senderIdentity: SenderIdentity & {
    sendingDomain: SendingDomain;
  };
  sendingDomain: SendingDomain;
}

/**
 * Result of preparing an email for a single recipient
 */
export interface PreparedEmail {
  emailSendId: string;
  messageId: string;
  recipientEmail: string;
  contactId: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from: string;
  replyTo?: string;
  envelopeSender: string;
  links: Array<{ original: string; tracking: string }>;
}

/**
 * Build the "from" address string
 *
 * @param senderIdentity - The sender identity
 * @param domain - The sending domain name
 * @returns Formatted from address (e.g., "John Doe <john@example.com>")
 */
function buildFromAddress(
  senderIdentity: SenderIdentity,
  domain: string
): string {
  const email = `${senderIdentity.email}@${domain}`;
  if (senderIdentity.name) {
    return `${senderIdentity.name} <${email}>`;
  }
  return email;
}

/**
 * Build personalization variables for a contact
 *
 * @param contact - The contact
 * @param broadcast - The broadcast
 * @returns Variables map for template substitution
 */
function buildVariables(
  contact: EmailContact,
  broadcast: EmailBroadcast
): Record<string, string> {
  const domain = broadcast.sendingDomain.name;
  const trackingDomain = `${broadcast.sendingDomain.trackingSubDomain}.${domain}`;

  return {
    email: contact.email,
    firstName: contact.firstName || "",
    first_name: contact.firstName || "",
    lastName: contact.lastName || "",
    last_name: contact.lastName || "",
    unsubscribe_url: `https://${trackingDomain}/u/${contact.id}/${broadcast.id}`,
    preferences_url: `https://${trackingDomain}/p/${contact.id}`,
    view_in_browser_url: `https://${trackingDomain}/v/${broadcast.id}/${contact.id}`,
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
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varName) => {
    return variables[varName] ?? match;
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
export async function prepareEmail(
  contact: EmailContact,
  broadcast: EmailBroadcast,
  options: {
    clickTracking?: boolean;
    openTracking?: boolean;
  } = {}
): Promise<PreparedEmail> {
  const domain = broadcast.sendingDomain.name;
  const trackingDomain = `${broadcast.sendingDomain.trackingSubDomain}.${domain}`;

  const { id: emailSendId, messageId } = generateMessageIdForDomain(domain);
  const variables = buildVariables(contact, broadcast);

  let htmlBody: string;

  if (broadcast.emailContent.contentJson) {
    htmlBody = await renderBroadcastToHtml(
      broadcast.emailContent.contentJson as BroadcastDocument,
      { variables }
    );
  } else if (broadcast.emailContent.contentHtml) {
    htmlBody = substituteVariables(broadcast.emailContent.contentHtml, variables);
  } else {
    throw new Error(`Broadcast ${broadcast.id} has no content`);
  }

  const trackingResult = applyTracking(htmlBody, trackingDomain, emailSendId, {
    clickTracking: options.clickTracking,
    openTracking: options.openTracking,
  });

  const from = buildFromAddress(
    broadcast.senderIdentity,
    broadcast.sendingDomain.name
  );

  const envelopeSender = `bounces+${emailSendId}@${broadcast.sendingDomain.returnPathSubDomain}.${domain}`;

  const subject = substituteVariables(
    broadcast.emailContent.subject,
    variables
  );

  return {
    emailSendId,
    messageId,
    recipientEmail: contact.email,
    contactId: contact.id,
    subject,
    htmlBody: trackingResult.html,
    from,
    envelopeSender,
    links: trackingResult.links,
  };
}

/**
 * Prepare multiple emails for batch sending
 *
 * @param contacts - Array of recipient contacts
 * @param broadcast - The broadcast data
 * @param options - Tracking options
 * @returns Array of prepared emails
 */
export async function prepareEmailBatch(
  contacts: EmailContact[],
  broadcast: EmailBroadcast,
  options: {
    clickTracking?: boolean;
    openTracking?: boolean;
  } = {}
): Promise<PreparedEmail[]> {
  const preparedEmails: PreparedEmail[] = [];

  for (const contact of contacts) {
    const prepared = await prepareEmail(contact, broadcast, options);
    preparedEmails.push(prepared);
  }

  return preparedEmails;
}
