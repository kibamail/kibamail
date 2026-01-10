/**
 * Send Reply Job
 *
 * Sends a reply to a conversation from the inbox.
 * For each job:
 * 1. Fetches the conversation and last message
 * 2. Generates a new emailSendId
 * 3. Builds threading headers (In-Reply-To, References)
 * 4. Sets reply-to with new token
 * 5. Injects email via MTA
 * 6. Creates outbound InboxMessage record
 */

import { prisma } from "@/lib/db";
import { htmlToPlainText } from "@/lib/email/html-to-text";
import { generateMessageIdForDomain } from "@/lib/email/message-id";
import { type EmailMessage, getMtaOptions, injectEmail } from "@/lib/mta";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { MessageDirection } from "@prisma/client";

const logger = queueLogger.child({ job: "send-reply" });

export const sendReply: JobProcessor<"inbox", "send-reply"> = async (
  data,
  jobId,
) => {
  const { conversationId, replyContent, replySubject } = data;

  logger.info({ jobId, conversationId }, "Processing inbox reply");

  // 1. Fetch conversation with the last message and required relations
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      sendingDomain: true,
      senderIdentity: {
        include: {
          sendingDomain: true,
        },
      },
      contact: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          messageId: true,
          referencesHeader: true,
          fromEmail: true,
          toEmail: true,
          subject: true,
        },
      },
    },
  });

  if (!conversation) {
    logger.error({ jobId, conversationId }, "Conversation not found");
    throw new Error(`Conversation ${conversationId} not found`);
  }

  if (!conversation.contact) {
    logger.error({ jobId, conversationId }, "Conversation has no contact");
    throw new Error(`Conversation ${conversationId} has no contact`);
  }

  if (!conversation.senderIdentity || !conversation.sendingDomain) {
    logger.error(
      { jobId, conversationId },
      "Conversation missing sender identity or domain",
    );
    throw new Error(
      `Conversation ${conversationId} missing sender identity or domain`,
    );
  }

  const lastMessage = conversation.messages[0];
  if (!lastMessage) {
    logger.error({ jobId, conversationId }, "Conversation has no messages");
    throw new Error(`Conversation ${conversationId} has no messages`);
  }

  const domain = conversation.sendingDomain.name;
  const senderIdentity = conversation.senderIdentity;

  // 2. Generate new emailSendId and messageId
  const { id: emailSendId, messageId } = generateMessageIdForDomain(domain);

  // 3. Build threading headers
  // References should contain all previous message IDs in the thread
  let references = lastMessage.referencesHeader || "";
  if (lastMessage.messageId) {
    references = references
      ? `${references} ${lastMessage.messageId}`
      : lastMessage.messageId;
  }

  // 4. Build subject (use Re: prefix if not already present)
  let subject = replySubject || conversation.subject;
  if (!subject.toLowerCase().startsWith("re:")) {
    subject = `Re: ${subject}`;
  }

  // 5. Build envelope sender for bounce handling
  const envelopeSender = `bounces+${emailSendId}@${conversation.sendingDomain.returnPathSubDomain}.${domain}`;

  // 6. Build reply-to with inbox tracking (plus-addressing)
  const replyToEmail = conversation.sendingDomain.inboxEnabled
    ? `${senderIdentity.email}+${emailSendId}@${domain}`
    : `${senderIdentity.email}@${domain}`;

  // 7. Build recipient name
  const recipientName = [
    conversation.contact.firstName,
    conversation.contact.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  // 8. Build MTA message
  const mtaMessage: EmailMessage = {
    id: emailSendId,
    tenant_id: conversation.workspaceId,
    broadcast_id: `inbox-${conversationId}`,
    contact_id: conversation.contact.id,
    pool: "transactional", // Inbox replies should use transactional pool
    recipient: {
      email: conversation.contact.email,
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
    preview_text: "",
    html_body: replyContent,
    text_body: htmlToPlainText(replyContent),
    attachments: [],
    headers: {
      "In-Reply-To": lastMessage.messageId || "",
      References: references,
    },
    metadata: {
      message_id: messageId,
      envelope_sender: envelopeSender,
      email_type: "inbox-reply",
      conversation_id: conversationId,
    },
    track_opens: false, // Don't track opens for inbox replies
    track_clicks: false, // Don't track clicks for inbox replies
  };

  // 9. Inject to MTA
  const mtaOptions = getMtaOptions();
  const result = await injectEmail(mtaOptions, mtaMessage);

  if (!result.success) {
    logger.error(
      { jobId, conversationId, emailSendId, error: result.error },
      "Failed to inject reply to MTA",
    );
    throw new Error(`Failed to inject reply: ${result.error}`);
  }

  // 10. Create outbound InboxMessage record
  await prisma.inboxMessage.create({
    data: {
      workspaceId: conversation.workspaceId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      emailSendId,
      inReplyToEmailSendId: lastMessage.messageId || null,
      fromEmail: `${senderIdentity.email}@${domain}`,
      fromName: senderIdentity.name,
      toEmail: conversation.contact.email,
      toName: recipientName || null,
      subject,
      htmlBody: replyContent,
      messageId,
      inReplyToHeader: lastMessage.messageId || null,
      referencesHeader: references || null,
      status: "READ", // Outbound messages are always "read"
      sentAt: new Date(),
    },
  });

  // 11. Update conversation stats
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
    },
  });

  logger.info(
    { jobId, conversationId, emailSendId },
    "Inbox reply sent",
  );
};
