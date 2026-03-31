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
import type { EmailMessage, EmailAttachment } from "@/lib/mta";
import { getMtaOptions, injectEmail } from "@/lib/mta";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { uploadPrivateFile } from "@/lib/storage";
import { resolveWorkspaceSettings, buildComplianceVariables } from "@/lib/workspace/settings";

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
  to: string;
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
  senderIdentity: {
    email: string;
    name: string | null;
    replyToEmail: string | null;
  },
  sendingDomain: { name: string },
  replyTo?: ReplyToInput
): { email: string; name: string | null } {
  if (replyTo) {
    return { email: replyTo.email, name: replyTo.name ?? null };
  }

  // If sender has a specific reply-to email, use it; otherwise construct from local part + domain
  const replyToEmail = senderIdentity.replyToEmail || `${senderIdentity.email}@${sendingDomain.name}`;
  return { email: replyToEmail, name: senderIdentity.name };
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
    replyTo,
    to: recipient,
    subject,
    htmlBody,
    textBody,
    attachments,
    previewText,
  } = data as JobData;

  logger.info(
    { jobId, workspaceId, recipient, emailSendId },
    "Processing transactional email"
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

  // Substitute compliance variables in HTML body and subject
  const wsSettings = await resolveWorkspaceSettings(workspaceId);
  const complianceVars = buildComplianceVariables(wsSettings);

  let finalHtmlBody = htmlBody;
  let finalSubject = subject;
  for (const [key, value] of Object.entries(complianceVars)) {
    finalHtmlBody = finalHtmlBody.replaceAll(`{{${key}}}`, value);
    finalSubject = finalSubject.replaceAll(`{{${key}}}`, value);
  }

  const finalTextBody = textBody || htmlToPlainText(finalHtmlBody);
  // Use emailSendId from API instead of generating a new ID
  // This ensures the ID returned to the user matches what's in the database and MTA headers
  const messageId = `<${emailSendId}@${sendingDomain.name}>`;
  const envelopeSender = `bounces+${emailSendId}@${sendingDomain.returnPathSubDomain}.${sendingDomain.name}`;
  const eventId = `evt_${emailSendId}`;
  const htmlS3Key = `emails/${workspaceId}/transactional/${emailSendId}/html`;
  const textS3Key = `emails/${workspaceId}/transactional/${emailSendId}/text`;

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    select: { contentS3Key: true },
  });

  if (existingEvent?.contentS3Key) {
    logger.info(
      { jobId, emailSendId, recipient, eventId },
      "Email already processed successfully, skipping"
    );
    return;
  }

  let htmlContent = finalHtmlBody;

  if (sendingDomain.openTrackingEnabled || sendingDomain.clickTrackingEnabled) {
    const trackingResult = applyTracking(
      htmlContent,
      `${sendingDomain.trackingSubDomain}.${sendingDomain.name}`,
      emailSendId,
      {
        clickTracking: sendingDomain.clickTrackingEnabled,
        openTracking: sendingDomain.openTrackingEnabled,
      }
    );
    htmlContent = trackingResult.html;
  }

  const senderEmail = `${senderIdentity.email}@${sendingDomain.name}`;
  const replyToAddress = buildReplyToAddress(
    senderIdentity,
    sendingDomain,
    replyTo
  );

  const mtaAttachments: EmailAttachment[] = (attachments || []).map((att) => ({
    file_name: att.filename,
    content_type: att.contentType,
    data: att.content,
    base64: true,
  }));

  const mtaMessage: EmailMessage = {
    id: emailSendId,
    tenant_id: workspaceId,
    broadcast_id: "",
    contact_id: "",
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
    subject: finalSubject,
    preview_text: previewText || "",
    html_body: htmlContent,
    text_body: finalTextBody,
    attachments: mtaAttachments,
    headers: {},
    metadata: {
      message_id: messageId,
      envelope_sender: envelopeSender,
    },
    track_opens: sendingDomain.openTrackingEnabled,
    track_clicks: sendingDomain.clickTrackingEnabled,
    sending_domain_id: sendingDomain.id,
    sender_identity_id: senderIdentity.id,
  };

  const mtaOptions = getMtaOptions();

  // Capture timestamp before injection so Queued event has correct order
  // (MTA webhooks arrive with their own timestamps which may be after injection)
  const queuedAt = new Date();

  const result = await injectEmail(mtaOptions, mtaMessage);

  logger.info(
    {
      jobId,
      recipient,
      success: result.success,
      error: result.error,
    },
    "Email injected to MTA"
  );

  if (!result.success) {
    throw new Error(`Failed to inject email to MTA: ${result.error}`);
  }

  // Upload HTML and text content to separate S3 keys
  await Promise.all([
    uploadPrivateFile(htmlS3Key, htmlContent, "text/html"),
    uploadPrivateFile(textS3Key, finalTextBody, "text/plain"),
  ]);

  await prisma.event.upsert({
    where: { id: eventId },
    create: {
      id: eventId,
      sendingId: emailSendId,
      workspaceId,
      type: "Queued",
      recipient,
      queue: "transactional",
      siteName: "transactional",
      contentS3Key: htmlS3Key,
      createdAt: queuedAt,
    },
    update: {
      contentS3Key: htmlS3Key,
    },
  });

  await prisma.transactionalEmail.upsert({
    where: { sendingId: emailSendId },
    create: {
      workspaceId,
      sendingId: emailSendId,
      fromEmail: senderEmail,
      fromName: senderIdentity.name,
      replyToEmail: replyToAddress.email,
      replyToName: replyToAddress.name,
      sendingDomainId: sendingDomain.id,
      senderIdentityId: senderIdentity.id,
      toEmail: recipient,
      subject: finalSubject,
      previewText: previewText || undefined,
      htmlContentS3Key: htmlS3Key,
      textContentS3Key: textS3Key,
      status: "SENDING",
      openTrackingEnabled: sendingDomain.openTrackingEnabled,
      clickTrackingEnabled: sendingDomain.clickTrackingEnabled,
      metadata: (data as JobData).metadata || undefined,
      sentAt: queuedAt,
    },
    update: {
      htmlContentS3Key: htmlS3Key,
      textContentS3Key: textS3Key,
      status: "SENDING",
      sentAt: queuedAt,
    },
  });

  logger.info(
    { jobId, eventId, recipient, sendingId: emailSendId },
    "Email processed, event and transactional email record created"
  );
};
