/**
 * Send Double Opt-In Job
 *
 * Sends a double opt-in confirmation email to a contact.
 * This job is queued when a form submission creates/updates
 * a contact with double opt-in enabled.
 *
 * The job:
 * 1. Fetches the contact, form, and email template
 * 2. Builds the confirmation URL using the contact's token
 * 3. Renders the email with personalization and confirmation URL
 * 4. Applies tracking if enabled
 * 5. Injects the email into the MTA
 */

import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import {
  renderBroadcastToHtml,
  type BroadcastDocument,
  type BroadcastStyles,
} from "@/lib/broadcast-renderer";
import { applyTracking } from "@/lib/email/tracking";
import { generateMessageIdForDomain } from "@/lib/email/message-id";

const logger = queueLogger.child({ job: "send-double-opt-in" });

/**
 * Build personalization variables for double opt-in email
 */
function buildDoubleOptInVariables(
  contact: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    confirmationToken: string;
  },
  trackingDomain: string
): Record<string, string> {
  return {
    // Contact variables
    "contact.email": contact.email,
    "contact.first_name": contact.firstName || "",
    "contact.last_name": contact.lastName || "",
    email: contact.email,
    firstName: contact.firstName || "",
    first_name: contact.firstName || "",
    lastName: contact.lastName || "",
    last_name: contact.lastName || "",
    // Confirmation URL - the key variable for double opt-in
    confirmation_url: `https://${trackingDomain}/c/${contact.confirmationToken}`,
  };
}

/**
 * Build the "from" address string
 */
function buildFromAddress(
  senderName: string,
  senderEmail: string,
  domainName: string
): string {
  const email = `${senderEmail}@${domainName}`;
  if (senderName) {
    return `${senderName} <${email}>`;
  }
  return email;
}

/**
 * Substitute variables in text
 * Replaces {{variable_name}} patterns with actual values.
 */
function substituteVariables(
  text: string,
  variables: Record<string, string>
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
    "Processing double opt-in email job"
  );

  // Fetch the contact with their confirmation token
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      workspaceId,
    },
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
    logger.error({ jobId, contactId }, "Contact not found");
    throw new Error(`Contact ${contactId} not found`);
  }

  // Check if contact is still unconfirmed
  if (contact.status !== "UNCONFIRMED") {
    logger.info(
      { jobId, contactId, status: contact.status },
      "Contact is no longer unconfirmed, skipping email"
    );
    return;
  }

  // Check if token exists
  if (!contact.confirmationToken) {
    logger.error({ jobId, contactId }, "Contact has no confirmation token");
    throw new Error(`Contact ${contactId} has no confirmation token`);
  }

  // Fetch the email template with sender identity
  const email = await prisma.email.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
    select: {
      id: true,
      subject: true,
      previewText: true,
      content: true,
      styles: true,
      senderIdentityId: true,
      replyToIdentityId: true,
      trackClicks: true,
      trackOpens: true,
    },
  });

  if (!email) {
    logger.error({ jobId, emailId }, "Email template not found");
    throw new Error(`Email ${emailId} not found`);
  }

  if (!email.subject) {
    logger.error({ jobId, emailId }, "Email has no subject");
    throw new Error(`Email ${emailId} has no subject`);
  }

  if (!email.content) {
    logger.error({ jobId, emailId }, "Email has no content");
    throw new Error(`Email ${emailId} has no content`);
  }

  if (!email.senderIdentityId) {
    logger.error({ jobId, emailId }, "Email has no sender identity");
    throw new Error(`Email ${emailId} has no sender identity configured`);
  }

  // Fetch sender identity with sending domain
  const senderIdentity = await prisma.senderIdentity.findUnique({
    where: { id: email.senderIdentityId },
    include: { sendingDomain: true },
  });

  if (!senderIdentity || !senderIdentity.sendingDomain) {
    logger.error(
      { jobId, senderIdentityId: email.senderIdentityId },
      "Sender identity or sending domain not found"
    );
    throw new Error(
      `Sender identity ${email.senderIdentityId} or its sending domain not found`
    );
  }

  const sendingDomain = senderIdentity.sendingDomain;
  const domainName = sendingDomain.name;
  const trackingDomain = `${sendingDomain.trackingSubDomain}.${domainName}`;

  // Build personalization variables including confirmation URL
  const variables = buildDoubleOptInVariables(
    {
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      confirmationToken: contact.confirmationToken,
    },
    trackingDomain
  );

  // Generate message ID
  const { id: emailSendId, messageId } = generateMessageIdForDomain(domainName);

  // Render the email content
  let htmlBody: string;
  try {
    htmlBody = await renderBroadcastToHtml(
      email.content as unknown as BroadcastDocument,
      { variables },
      email.styles as BroadcastStyles | undefined
    );
  } catch (renderError) {
    logger.error(
      { jobId, emailId, error: renderError },
      "Failed to render email content"
    );
    throw renderError;
  }

  // Apply tracking if enabled
  const trackingResult = applyTracking(htmlBody, trackingDomain, emailSendId, {
    clickTracking: email.trackClicks,
    openTracking: email.trackOpens,
  });

  // Build from address
  const from = buildFromAddress(
    senderIdentity.name,
    senderIdentity.email,
    domainName
  );

  // Build envelope sender for bounce handling
  const envelopeSender = `bounces+${emailSendId}@${sendingDomain.returnPathSubDomain}.${domainName}`;

  // Substitute variables in subject
  const subject = substituteVariables(email.subject, variables);

  // Prepare the email data for MTA injection
  const preparedEmail = {
    emailSendId,
    messageId,
    recipientEmail: contact.email,
    contactId: contact.id,
    subject,
    htmlBody: trackingResult.html,
    from,
    envelopeSender,
    links: trackingResult.links,
    // Additional metadata for tracking
    type: "double-opt-in" as const,
    formId,
    emailId,
  };

  logger.info(
    {
      jobId,
      emailSendId,
      recipientEmail: contact.email,
      subject,
      linksCount: trackingResult.links.length,
    },
    "Prepared double opt-in email"
  );

  // TODO: Inject email into MTA
  // For now, log the prepared email (actual MTA injection to be implemented)
  // In production, this would:
  // 1. Call the MTA injector HTTP API
  // 2. Store an Event record for tracking
  // 3. Handle retries for failed injections

  logger.info(
    {
      jobId,
      emailSendId,
      contactId: contact.id,
      contactEmail: contact.email,
    },
    "Double opt-in email job completed"
  );
};
