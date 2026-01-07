/**
 * Process Inbound Email Job
 *
 * Processes an inbound email received from the MTA.
 * For each job:
 * 1. Downloads the raw email from S3
 * 2. Parses the email content
 * 3. Finds or creates the conversation (orphan if no matching outbound)
 * 4. Uploads attachments to S3
 * 5. Creates the inbox message record
 * 6. Updates conversation stats
 */

import { prisma } from "@/lib/db";
import { parseEmail } from "@/lib/email/parser";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import {
  downloadPrivateFile,
  uploadPrivateFile,
} from "@/lib/storage/private-storage";
import { createId } from "@paralleldrive/cuid2";
import { ConversationOriginType, MessageDirection } from "@prisma/client";

const logger = queueLogger.child({ job: "process-inbound-email" });

export const processInboundEmail: JobProcessor<
  "inbox",
  "process-inbound-email"
> = async (data, jobId) => {
  const {
    token,
    s3Key,
    sender,
    recipient,
    workspaceId,
    sendingDomainId,
    receivedAt,
  } = data;

  logger.info(
    { jobId, token: token || "(unsolicited)", sender, recipient },
    "Processing inbound email",
  );

  // 1. Download and parse the raw email from S3
  const rawEmailResult = await downloadPrivateFile(s3Key);
  if (!rawEmailResult.body) {
    logger.error({ jobId, s3Key }, "Failed to download raw email from S3");
    throw new Error(`Raw email not found at ${s3Key}`);
  }

  const rawEmailBuffer = await rawEmailResult.body.transformToByteArray();
  const rawEmailString = Buffer.from(rawEmailBuffer).toString("utf-8");
  const parsed = await parseEmail(rawEmailString);

  logger.debug(
    {
      jobId,
      subject: parsed.subject,
      fromEmail: parsed.fromEmail,
      attachmentCount: parsed.attachments.length,
    },
    "Email parsed",
  );

  // 2. Find the original outbound email by token (emailSendId)
  let conversationId: string | null = null;
  let isUnsolicited = !token || token === "";

  if (!isUnsolicited) {
    const originalMessage = await prisma.inboxMessage.findFirst({
      where: {
        emailSendId: token,
        direction: MessageDirection.OUTBOUND,
      },
      select: {
        conversationId: true,
        conversation: {
          select: {
            id: true,
            workspaceId: true,
          },
        },
      },
    });

    if (originalMessage) {
      conversationId = originalMessage.conversationId;
      logger.debug(
        { jobId, token, conversationId },
        "Found matching conversation for token",
      );
    } else {
      logger.warn(
        { jobId, token },
        "No matching outbound message found for token - treating as unsolicited",
      );
      isUnsolicited = true;
    }
  }

  // 3. Upload attachments to S3
  const attachmentRecords: Array<{
    filename: string;
    contentType: string;
    size: number;
    s3Key: string;
    contentId?: string;
    isInline: boolean;
  }> = [];
  for (const att of parsed.attachments) {
    const attId = createId();
    const attS3Key = `inbox/attachments/${workspaceId}/${attId}/${att.filename}`;

    await uploadPrivateFile(attS3Key, att.content, att.contentType);

    attachmentRecords.push({
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
      s3Key: attS3Key,
      contentId: att.contentId,
      isInline: att.isInline,
    });

    logger.debug(
      { jobId, filename: att.filename, s3Key: attS3Key },
      "Attachment uploaded",
    );
  }

  // 4. Create inbox message and update/create conversation in a transaction
  const result = await prisma.$transaction(async (tx) => {
    let finalConversationId = conversationId;

    if (isUnsolicited || !finalConversationId) {
      // Create orphan conversation for unsolicited emails
      // Try to find existing contact by sender email
      const contact = await tx.contact.findFirst({
        where: { workspaceId, email: sender },
        select: { id: true },
      });

      const newConversation = await tx.conversation.create({
        data: {
          workspaceId,
          sendingDomainId,
          contactId: contact?.id || null,
          senderIdentityId: null,
          originType: ConversationOriginType.UNSOLICITED,
          originId: null,
          originEmailSendId: null,
          subject: parsed.subject,
          lastMessageAt: new Date(receivedAt),
          messageCount: 1,
          unreadCount: 1,
          status: "OPEN",
        },
      });

      finalConversationId = newConversation.id;
      logger.info(
        { jobId, conversationId: finalConversationId, isUnsolicited: true },
        "Created orphan conversation for unsolicited email",
      );
    } else {
      // Update existing conversation
      await tx.conversation.update({
        where: { id: finalConversationId },
        data: {
          lastMessageAt: new Date(receivedAt),
          messageCount: { increment: 1 },
          unreadCount: { increment: 1 },
          status: "OPEN", // Re-open if it was closed
        },
      });
    }

    // Generate unique ID for this inbound message
    const inboundEmailSendId = `in_${Date.now().toString(36)}_${createId().slice(0, 8)}`;

    // Create the inbound message
    const inboxMessage = await tx.inboxMessage.create({
      data: {
        workspaceId,
        conversationId: finalConversationId,
        direction: MessageDirection.INBOUND,
        emailSendId: inboundEmailSendId,
        inReplyToEmailSendId: token || null,
        fromEmail: parsed.fromEmail,
        fromName: parsed.fromName,
        toEmail: recipient,
        toName: parsed.toName,
        subject: parsed.subject,
        textBody: parsed.textBody,
        htmlBody: parsed.htmlBody,
        rawEmail: rawEmailString.length > 100000 ? null : rawEmailString, // Only store if < 100KB
        contentS3Key: rawEmailString.length > 100000 ? s3Key : null,
        messageId: parsed.messageId,
        inReplyToHeader: parsed.inReplyTo,
        referencesHeader: parsed.references,
        status: "UNREAD",
        receivedAt: new Date(receivedAt),
        attachments: {
          create: attachmentRecords,
        },
      },
      select: {
        id: true,
        conversationId: true,
      },
    });

    return {
      messageId: inboxMessage.id,
      conversationId: inboxMessage.conversationId,
      isUnsolicited,
    };
  });

  logger.info(
    {
      jobId,
      messageId: result.messageId,
      conversationId: result.conversationId,
      isUnsolicited: result.isUnsolicited,
      attachmentCount: attachmentRecords.length,
    },
    "Inbound email processed",
  );

  // TODO: Trigger notifications (webhooks, real-time updates, etc.)
};
