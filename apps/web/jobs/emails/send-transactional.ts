/**
 * Send Transactional Email Job
 *
 * Processes a transactional email send request.
 * Injects email directly to MTA via HTTP with pool set to "transactional".
 *
 * For each email:
 * 1. Fetches sender identity with sending domain
 * 2. Auto-generates text body if not provided
 * 3. Generates Message-ID
 * 4. Applies tracking if enabled on domain
 * 5. Injects email directly to MTA via HTTP
 * 6. Creates Event record
 * 7. Optional: Creates Conversation and InboxMessage if inbox enabled
 */

import type { SenderIdentity, SendingDomain } from "@prisma/client";
import { htmlToPlainText } from "@/lib/email/html-to-text";
import { applyTracking } from "@/lib/email/tracking";
import { generateMessageIdForDomain } from "@/lib/email/message-id";
import type { EmailMessage, EmailAttachment } from "@/lib/mta";
import { getMtaOptions, injectEmail } from "@/lib/mta";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";

const logger = queueLogger.child({ job: "send-transactional" });

/**
 * Create conversation and inbox message for a transactional email
 * This is only done when inbox is enabled for the sending domain
 */
async function createConversationForTransactionalEmail(data: {
  workspaceId: string;
  emailSendId: string;
  senderIdentityId: string;
  sendingDomainId: string;
  recipient: string;
  subject: string;
  messageId: string;
}): Promise<void> {
  const {
    workspaceId,
    emailSendId,
    senderIdentityId,
    sendingDomainId,
    recipient,
    subject,
    messageId,
  } = data;

  try {
    await prisma.conversation.create({
      data: {
        workspaceId,
        contactId: null,
        senderIdentityId,
        sendingDomainId,
        originType: "TRANSACTIONAL",
        originId: emailSendId,
        originEmailSendId: emailSendId,
        subject,
        lastMessageAt: new Date(),
        messageCount: 1,
        unreadCount: 0,
        status: "OPEN",
      },
    });
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to create conversation for transactional email",
    );
    return;
  }

  const senderIdentity = await prisma.senderIdentity.findUnique({
    where: { id: senderIdentityId },
    include: { sendingDomain: true },
  });

  if (!senderIdentity) {
    return;
  }

  const senderEmail = `${senderIdentity.email}@${senderIdentity.sendingDomain.name}`;

  try {
    await prisma.inboxMessage.create({
      data: {
        workspaceId,
        conversationId: emailSendId,
        direction: "OUTBOUND",
        emailSendId,
        fromEmail: senderEmail,
        fromName: senderIdentity.name || null,
        toEmail: recipient,
        toName: null,
        subject,
        contentS3Key: `emails/${workspaceId}/transactional/${emailSendId}`,
        messageId,
        status: "READ",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to create inbox message for transactional email",
    );
  }
}

/**
 * Build MTA attachment objects from job data attachments
 */
function buildMtaAttachments(
  jobAttachments: Array<{ s3_key: string; file_name: string; content_type: string }> | undefined,
): EmailAttachment[] {
  if (!jobAttachments || jobAttachments.length === 0) {
    return [];
  }

  return jobAttachments.map((att) => ({
    s3_key: att.s3_key,
    file_name: att.file_name,
    content_type: att.content_type,
  }));
}

/**
 * Build the reply-to address
 */
function buildReplyTo(
  senderIdentity: SenderIdentity,
  sendingDomain: SendingDomain,
  emailSendId: string,
  inboxEnabled: boolean,
): string {
  const localPart = senderIdentity.replyToEmail || senderIdentity.email;

  if (inboxEnabled) {
    return `${emailSendId}+${localPart}@${sendingDomain.trackingSubDomain}.${sendingDomain.name}`;
  }

  return `${localPart}@${sendingDomain.name}`;
}

export const sendTransactional: JobProcessor<
  "emails",
  "send-transactional"
> = async (data, jobId) => {
  const {
    emailSendId,
    workspaceId,
    senderIdentityId,
    sendingDomainId,
    replyToEmail,
    to,
    subject,
    htmlBody,
    textBody,
    attachments,
    metadata,
    inboxEnabled,
  } = data;

  logger.info(
    { jobId, emailSendId, workspaceId, recipient: to },
    "Processing transactional email",
  );

  const recipient = Array.isArray(to) ? to[0] : to;

  const senderIdentity = await prisma.senderIdentity.findUnique({
    where: { id: senderIdentityId },
    include: { sendingDomain: true },
  });

  if (!senderIdentity) {
    logger.error({ jobId, senderIdentityId }, "Sender identity not found");
    throw new Error(`Sender identity ${senderIdentityId} not found`);
  }

  const sendingDomain = senderIdentity.sendingDomain;
  if (!sendingDomain) {
    logger.error({ jobId, sendingDomainId }, "Sending domain not found");
    throw new Error(`Sending domain ${sendingDomainId} not found`);
  }

  const finalTextBody = textBody || htmlToPlainText(htmlBody);

  const { id, messageId } = generateMessageIdForDomain(sendingDomain.name);

  const envelopeSender = `bounces+${id}@${sendingDomain.returnPathSubDomain}.${sendingDomain.name}`;

  let htmlContent = htmlBody;

  if (sendingDomain.openTrackingEnabled || sendingDomain.clickTrackingEnabled) {
    const trackingResult = applyTracking(htmlContent, `${sendingDomain.trackingSubDomain}.${sendingDomain.name}`, id, {
      clickTracking: sendingDomain.clickTrackingEnabled,
      openTracking: sendingDomain.openTrackingEnabled,
    });
    htmlContent = trackingResult.html;
  }

  const senderEmail = `${senderIdentity.email}@${sendingDomain.name}`;
  const replyTo = buildReplyTo(senderIdentity, sendingDomain, id, inboxEnabled);

  const mtaMessage: EmailMessage = {
    id,
    tenant_id: workspaceId,
    broadcast_id: "transactional",
    contact_id: "transactional",
    pool: "transactional",
    recipient: {
      email: recipient,
      name: "",
    },
    sender: {
      email: senderIdentity.email,
      name: senderIdentity.name,
      domain: sendingDomain.name,
    },
    reply_to: {
      email: replyTo,
      name: senderIdentity.name,
    },
    subject,
    preview_text: "",
    html_body: htmlContent,
    text_body: finalTextBody,
    attachments: buildMtaAttachments(attachments),
    headers: {},
    metadata: {
      message_id: messageId,
      envelopeSender,
    },
    track_opens: sendingDomain.openTrackingEnabled,
    track_clicks: sendingDomain.clickTrackingEnabled,
  };

  const mtaOptions = getMtaOptions();
  const result = await injectEmail(mtaOptions, mtaMessage);

  logger.info(
    {
      jobId,
      emailSendId,
      recipient,
      success: result.success,
      error: result.error,
    },
    "Email injected to MTA",
  );

  if (!result.success) {
    throw new Error(`Failed to inject email to MTA: ${result.error}`);
  }

  await prisma.event.create({
    data: {
      id: `evt_${id}`,
      sendingId: id,
      workspaceId,
      type: "Queued",
      recipient,
      queue: "transactional",
      siteName: "transactional",
      createdAt: new Date(),
    },
  });

  if (inboxEnabled) {
    await createConversationForTransactionalEmail({
      workspaceId,
      emailSendId: id,
      senderIdentityId,
      sendingDomainId,
      recipient,
      subject,
      messageId,
    });
  }
};
