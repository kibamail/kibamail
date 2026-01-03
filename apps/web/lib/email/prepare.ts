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
import { uploadPrivateFile } from "@/lib/storage/private-storage";
import type { EmailMessage } from "@/lib/nats";

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
  workspaceId: string;
  emailContent: {
    subject: string;
    previewText?: string | null;
    contentJson?: unknown;
    contentHtml?: string | null;
    contentText?: string | null;
  };
  senderIdentity: SenderIdentity & {
    sendingDomain: SendingDomain;
  };
  sendingDomain: SendingDomain;
  trackOpens?: boolean | null;
  trackClicks?: boolean | null;
  replyToEmail: string;
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
  textBody?: string;

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
): Promise<PreparedEmail> {
  const domain = broadcast.sendingDomain.name;
  const trackingDomain = `${broadcast.sendingDomain.trackingSubDomain}.${domain}`;

  const { id: emailSendId, messageId } = generateMessageIdForDomain(domain);
  const variables = buildVariables(contact, broadcast);

  // Tracking settings
  const trackOpens = broadcast.trackOpens ?? true;
  const trackClicks = broadcast.trackClicks ?? true;

  // Render HTML content
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

  // Apply tracking (link rewriting, open pixel)
  const trackingResult = applyTracking(htmlBody, trackingDomain, emailSendId, {
    clickTracking: trackClicks,
    openTracking: trackOpens,
  });

  // Prepare plain text version
  let textBody: string | undefined;
  if (broadcast.emailContent.contentText) {
    textBody = substituteVariables(broadcast.emailContent.contentText, variables);
  }

  // Build envelope sender for bounce handling
  const envelopeSender = `bounces+${emailSendId}@${broadcast.sendingDomain.returnPathSubDomain}.${domain}`;

  // Substitute variables in subject and preview text
  const subject = substituteVariables(broadcast.emailContent.subject, variables);
  const previewText = broadcast.emailContent.previewText
    ? substituteVariables(broadcast.emailContent.previewText, variables)
    : "";

  return {
    // Identifiers
    emailSendId,
    messageId,
    workspaceId: broadcast.workspaceId,
    broadcastId: broadcast.id,
    contactId: contact.id,

    // Recipient
    recipientEmail: contact.email,
    recipientFirstName: contact.firstName ?? "",
    recipientLastName: contact.lastName ?? "",

    // Sender
    senderEmail: broadcast.senderIdentity.email,
    senderName: broadcast.senderIdentity.name ?? "",
    senderDomain: domain,
    envelopeSender,
    replyTo: broadcast.replyToEmail,

    // Content
    subject,
    previewText,
    htmlBody: trackingResult.html,
    textBody,

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
 * Convert prepared emails to NATS message format
 *
 * Uploads email content to S3 and creates the message payload
 * expected by the email-agent.
 *
 * @param preparedEmails - Array of prepared emails
 * @returns Array of NATS email messages ready for publishing
 */
export async function convertToNatsMessages(
  preparedEmails: PreparedEmail[]
): Promise<EmailMessage[]> {
  const messages: EmailMessage[] = [];

  for (const prepared of preparedEmails) {
    // Upload HTML content to S3
    const contentKey = `emails/${prepared.workspaceId}/${prepared.broadcastId}/${prepared.emailSendId}`;
    const htmlKey = `${contentKey}/content.html`;

    await uploadPrivateFile(htmlKey, prepared.htmlBody, "text/html");

    // Upload plain text if available
    if (prepared.textBody) {
      const textKey = `${contentKey}/content.txt`;
      await uploadPrivateFile(textKey, prepared.textBody, "text/plain");
    }

    // Build recipient name from first and last name
    const recipientName = [prepared.recipientFirstName, prepared.recipientLastName]
      .filter(Boolean)
      .join(" ");

    messages.push({
      id: prepared.emailSendId,
      tenant_id: prepared.workspaceId,
      broadcast_id: prepared.broadcastId,
      contact_id: prepared.contactId,
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
      content_key: contentKey,
      attachments: [],
      metadata: {
        message_id: prepared.messageId,
        envelope_sender: prepared.envelopeSender,
      },
      track_opens: prepared.trackOpens,
      track_clicks: prepared.trackClicks,
    });
  }

  return messages;
}
