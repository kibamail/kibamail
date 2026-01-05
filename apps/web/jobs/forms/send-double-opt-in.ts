/**
 * Send Double Opt-In Email Job
 *
 * Sends a confirmation email to a contact who signed up via a form with
 * double opt-in enabled.
 *
 * For each job:
 * 1. Validates the contact is still UNCONFIRMED
 * 2. Fetches the email template configured for the form
 * 3. Renders the email with personalization and confirmation URL
 * 4. Uploads content to S3
 * 5. Publishes email message to NATS for MTA injection
 */

import {
  type BroadcastDocument,
  renderBroadcastToHtml,
} from "@/lib/broadcast-renderer";
import { prisma } from "@/lib/db";
import { generateMessageIdForDomain } from "@/lib/email/message-id";
import { type EmailMessage, getNatsOptions, publishEmail } from "@/lib/nats";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { uploadPrivateFile } from "@/lib/storage/private-storage";

const logger = queueLogger.child({ job: "send-double-opt-in" });

/**
 * Build the confirmation URL for a contact
 *
 * Uses the tracking domain pattern: https://{trackingDomain}/confirm/{formId}/{token}
 */
function buildConfirmationUrl(
  trackingDomain: string,
  formId: string,
  confirmationToken: string,
): string {
  return `https://${trackingDomain}/confirm/${formId}/${confirmationToken}`;
}

/**
 * Build personalization variables for the confirmation email
 */
function buildVariables(
  contact: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  },
  confirmationUrl: string,
): Record<string, string> {
  return {
    email: contact.email,
    "contact.email": contact.email,
    firstName: contact.firstName || "",
    first_name: contact.firstName || "",
    "contact.first_name": contact.firstName || "",
    lastName: contact.lastName || "",
    last_name: contact.lastName || "",
    "contact.last_name": contact.lastName || "",
    confirmation_url: confirmationUrl,
  };
}

/**
 * Substitute variables in text
 *
 * Replaces {{variable_name}} patterns with actual values.
 */
function substituteVariables(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varName) => {
    return variables[varName] ?? match;
  });
}

export const sendDoubleOptIn: JobProcessor<
  "forms",
  "send-double-opt-in"
> = async (data, jobId) => {
  const { contactId, formId, emailId, workspaceId } = data;

  logger.info(
    { jobId, contactId, formId, emailId, workspaceId },
    "Processing double opt-in email",
  );

  // Fetch the contact
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      confirmationToken: true,
    },
  });

  if (!contact) {
    logger.warn({ jobId, contactId }, "Contact not found, skipping");
    return;
  }

  // Validate contact is still UNCONFIRMED
  if (contact.status !== "UNCONFIRMED") {
    logger.info(
      { jobId, contactId, status: contact.status },
      "Contact is not UNCONFIRMED, skipping",
    );
    return;
  }

  // Validate confirmation token exists
  if (!contact.confirmationToken) {
    logger.error(
      { jobId, contactId },
      "Contact has no confirmation token, skipping",
    );
    return;
  }

  // Fetch the email template with sender identity
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      formsAsDoubleOptIn: {
        where: { id: formId },
        select: { id: true },
      },
    },
  });

  if (!email) {
    logger.error({ jobId, emailId }, "Email template not found");
    throw new Error(`Email template ${emailId} not found`);
  }

  // Validate email has required content
  if (!email.subject) {
    throw new Error(`Email template ${emailId} has no subject`);
  }

  if (!email.content) {
    throw new Error(`Email template ${emailId} has no content`);
  }

  // Get the sender identity - use the one configured on the email, or fall back to workspace default
  let senderIdentityId = email.senderIdentityId;

  if (!senderIdentityId) {
    // Find the first available sender identity in the workspace
    const defaultSender = await prisma.senderIdentity.findFirst({
      where: { workspaceId },
      select: { id: true },
    });

    if (!defaultSender) {
      throw new Error(
        `No sender identity available for workspace ${workspaceId}`,
      );
    }

    senderIdentityId = defaultSender.id;
  }

  // Fetch sender identity with sending domain
  const senderIdentity = await prisma.senderIdentity.findUnique({
    where: { id: senderIdentityId },
    include: {
      sendingDomain: true,
    },
  });

  if (!senderIdentity || !senderIdentity.sendingDomain) {
    throw new Error(
      `Sender identity ${senderIdentityId} or its sending domain not found`,
    );
  }

  const sendingDomain = senderIdentity.sendingDomain;
  const domain = sendingDomain.name;
  const trackingDomain = `${sendingDomain.trackingSubDomain}.${domain}`;

  // Build confirmation URL
  const confirmationUrl = buildConfirmationUrl(
    trackingDomain,
    formId,
    contact.confirmationToken,
  );

  // Build variables for personalization
  const variables = buildVariables(contact, confirmationUrl);

  // Generate message ID
  const { id: emailSendId, messageId } = generateMessageIdForDomain(domain);

  // Render HTML content
  let htmlBody: string;
  try {
    htmlBody = await renderBroadcastToHtml(
      email.content as unknown as BroadcastDocument,
      {
        variables,
      },
    );
  } catch (error) {
    logger.error({ jobId, emailId, error }, "Failed to render email content");
    throw error;
  }

  // Substitute variables in subject and preview text
  const subject = substituteVariables(email.subject, variables);
  const previewText = email.previewText
    ? substituteVariables(email.previewText, variables)
    : "";

  // Upload HTML content to S3
  const contentKey = `emails/${workspaceId}/double-opt-in/${formId}/${emailSendId}`;
  const htmlKey = `${contentKey}/content.html`;

  await uploadPrivateFile(htmlKey, htmlBody, "text/html");

  // Build envelope sender for bounce handling
  const envelopeSender = `bounces+${emailSendId}@${sendingDomain.returnPathSubDomain}.${domain}`;

  // Build reply-to email
  let replyToEmail: string;
  if (email.replyToIdentityId) {
    const replyToIdentity = await prisma.senderIdentity.findUnique({
      where: { id: email.replyToIdentityId },
      include: { sendingDomain: true },
    });
    if (replyToIdentity?.sendingDomain) {
      replyToEmail = `${replyToIdentity.email}@${replyToIdentity.sendingDomain.name}`;
    } else {
      replyToEmail = `${senderIdentity.email}@${domain}`;
    }
  } else {
    replyToEmail = `${senderIdentity.email}@${domain}`;
  }

  // Build recipient name
  const recipientName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  // Build unsubscribe URL for List-Unsubscribe headers
  // Uses the contact's unsubscribe endpoint - will delete unconfirmed contact
  const unsubscribeUrl = `https://${trackingDomain}/u/${contact.id}/doi-${formId}`;

  // Build NATS message
  const natsMessage: EmailMessage = {
    id: emailSendId,
    tenant_id: workspaceId,
    broadcast_id: `doi-${formId}`, // Use "doi-" prefix to distinguish from broadcasts
    contact_id: contact.id,
    pool: "marketing",
    recipient: {
      email: contact.email,
      name: recipientName,
    },
    sender: {
      email: senderIdentity.email,
      name: senderIdentity.name,
      domain,
    },
    reply_to: {
      email: replyToEmail,
      name: "",
    },
    subject,
    preview_text: previewText,
    content_key: contentKey,
    attachments: [],
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    metadata: {
      message_id: messageId,
      envelope_sender: envelopeSender,
      email_type: "double-opt-in",
      form_id: formId,
    },
    track_opens: email.trackOpens,
    track_clicks: email.trackClicks,
  };

  // Publish to NATS
  const natsOptions = getNatsOptions();
  const ack = await publishEmail(natsOptions, natsMessage);

  logger.info(
    {
      jobId,
      contactId,
      formId,
      emailId,
      emailSendId,
      stream: ack.stream,
      seq: ack.seq,
      duplicate: ack.duplicate,
    },
    "Double opt-in email published to NATS",
  );
};
