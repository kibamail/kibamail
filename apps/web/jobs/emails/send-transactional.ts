/**
 * Send Transactional Email Job
 *
 * Processes a transactional email send request.
 * Injects email directly to MTA via HTTP with pool set to "transactional".
 *
 * For each email:
 * 1. Check idempotency - if S3 upload failed, re-upload and create event
 * 2. Apply tracking if enabled on domain
 * 3. Inject email directly to MTA via HTTP with inline base64 attachments
 * 4. Upload RFC822 email to S3 for display (archival)
 * 5. Create Event record
 */

import { htmlToPlainText } from "@/lib/email/html-to-text";
import { applyTracking } from "@/lib/email/tracking";
import { generateMessageIdForDomain } from "@/lib/email/message-id";
import type { EmailMessage, EmailAttachment } from "@/lib/mta";
import { getMtaOptions, injectEmail } from "@/lib/mta";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { uploadPrivateFile } from "@/lib/storage";

const logger = queueLogger.child({ job: "send-transactional" });

interface ReplyToInput {
  email: string;
  name?: string;
}

interface AttachmentInput {
  filename: string;
  contentType: string;
  content: string;
  index: number;
}

interface JobData {
  emailSendId: string;
  workspaceId: string;
  senderIdentityId: string;
  sendingDomainId: string;
  replyTo?: ReplyToInput;
  to: string | string[];
  subject: string;
  previewText?: string;
  htmlBody: string;
  textBody?: string;
  attachments?: AttachmentInput[];
  metadata?: Record<string, string>;
}

/**
 * Build the reply-to address for MTA
 */
function buildReplyToAddress(
  senderIdentity: { email: string; name: string | null; replyToEmail: string | null },
  sendingDomain: { name: string },
  replyTo?: ReplyToInput,
): { email: string; name: string | null } {
  if (replyTo) {
    return { email: replyTo.email, name: replyTo.name ?? null };
  }

  const replyToEmail = senderIdentity.replyToEmail || senderIdentity.email;
  return { email: replyToEmail, name: senderIdentity.name };
}

/**
 * Build RFC822 email content for S3 storage
 */
function buildRfc822Email(params: {
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  replyTo: { email: string; name: string | null };
  subject: string;
  messageId: string;
  htmlBody: string;
}): string {
  const { fromEmail, fromName, toEmail, replyTo, subject, messageId, htmlBody } = params;

  const fromHeader = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  const replyToHeader = replyTo.name
    ? `"${replyTo.name}" <${replyTo.email}>`
    : replyTo.email;

  const headers = [
    `From: ${fromHeader}`,
    `To: ${toEmail}`,
    `Reply-To: ${replyToHeader}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    htmlBody,
  ];

  return headers.join("\r\n");
}

export const sendTransactional: JobProcessor<"emails", "send-transactional"> = async (data, jobId) => {
  const {
    emailSendId,
    workspaceId,
    senderIdentityId,
    sendingDomainId,
    replyTo,
    to,
    subject,
    previewText,
    htmlBody,
    textBody,
    attachments,
    metadata,
  } = data as JobData;

  const recipient = Array.isArray(to) ? to[0] : to;

  logger.info(
    { jobId, workspaceId, recipient, emailSendId },
    "Processing transactional email",
  );

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
  const eventId = `evt_${id}`;
  const s3Key = `emails/${workspaceId}/transactional/${id}`;

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    select: { contentS3Key: true },
  });

  if (existingEvent?.contentS3Key) {
    logger.info(
      { jobId, emailSendId, recipient, eventId },
      "Email already processed successfully, skipping",
    );
    return;
  }

  let htmlContent = htmlBody;

  if (sendingDomain.openTrackingEnabled || sendingDomain.clickTrackingEnabled) {
    const trackingResult = applyTracking(htmlContent, `${sendingDomain.trackingSubDomain}.${sendingDomain.name}`, id, {
      clickTracking: sendingDomain.clickTrackingEnabled,
      openTracking: sendingDomain.openTrackingEnabled,
    });
    htmlContent = trackingResult.html;
  }

  const senderEmail = `${senderIdentity.email}@${sendingDomain.name}`;
  const replyToAddress = buildReplyToAddress(senderIdentity, sendingDomain, replyTo);

  const mtaAttachments: EmailAttachment[] = (attachments || []).map((att) => ({
    file_name: att.filename,
    content_type: att.contentType,
    data: att.content,
    base64: true,
  }));

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
      email: replyToAddress.email,
      name: replyToAddress.name ?? "",
    },
    subject,
    preview_text: previewText || "",
    html_body: htmlContent,
    text_body: finalTextBody,
    attachments: mtaAttachments,
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
      recipient,
      success: result.success,
      error: result.error,
    },
    "Email injected to MTA",
  );

  if (!result.success) {
    throw new Error(`Failed to inject email to MTA: ${result.error}`);
  }

  const rfc822Content = buildRfc822Email({
    fromEmail: senderEmail,
    fromName: senderIdentity.name,
    toEmail: recipient,
    replyTo: replyToAddress,
    subject,
    messageId,
    htmlBody: htmlContent,
  });

  await uploadPrivateFile(s3Key, rfc822Content, "message/rfc822");

  await prisma.event.upsert({
    where: { id: eventId },
    create: {
      id: eventId,
      sendingId: id,
      workspaceId,
      type: "Queued",
      recipient,
      queue: "transactional",
      siteName: "transactional",
      contentS3Key: s3Key,
      createdAt: new Date(),
    },
    update: {
      contentS3Key: s3Key,
    },
  });

  logger.info({ jobId, eventId, recipient }, "Email processed and event created/updated");
};
