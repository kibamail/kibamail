/**
 * Conversation Creation Utility
 *
 * Creates conversations and outbound messages when emails are sent
 * from inbox-enabled sending domains.
 */

import { prisma } from "@/lib/db";
import { queueLogger } from "@/lib/queue";
import {
  ConversationOriginType,
  MessageDirection,
  type Prisma,
} from "@prisma/client";

const logger = queueLogger.child({ module: "conversation" });

/**
 * Parameters for creating a conversation with an outbound message
 */
export interface CreateConversationParams {
  /** Workspace ID */
  workspaceId: string;
  /** Contact ID */
  contactId: string;
  /** Sender identity ID */
  senderIdentityId: string;
  /** Sending domain ID */
  sendingDomainId: string;
  /** Origin type (what started the conversation) */
  originType: ConversationOriginType;
  /** Origin ID (broadcast ID, form ID, etc.) */
  originId: string;
  /** Unique email send ID (used for correlation) */
  emailSendId: string;
  /** RFC822 Message-ID header */
  messageId: string;
  /** Email subject */
  subject: string;
  /** Sender email address */
  fromEmail: string;
  /** Sender display name */
  fromName?: string;
  /** Recipient email address */
  toEmail: string;
  /** Recipient display name */
  toName?: string;
  /** HTML body (optional, may be stored in S3) */
  htmlBody?: string;
  /** S3 content key (if HTML is stored externally) */
  contentS3Key?: string;
}

/**
 * Result of creating a conversation
 */
export interface CreateConversationResult {
  conversationId: string;
  messageId: string;
}

/**
 * Create a conversation and outbound message when an email is sent
 *
 * This should only be called when the sending domain has inbox enabled.
 * The conversation allows tracking replies to the outbound email.
 *
 * @param params - Parameters for creating the conversation
 * @returns The created conversation and message IDs
 */
export async function createConversationWithOutboundMessage(
  params: CreateConversationParams,
): Promise<CreateConversationResult> {
  const {
    workspaceId,
    contactId,
    senderIdentityId,
    sendingDomainId,
    originType,
    originId,
    emailSendId,
    messageId,
    subject,
    fromEmail,
    fromName,
    toEmail,
    toName,
    htmlBody,
    contentS3Key,
  } = params;

  logger.debug(
    { workspaceId, contactId, originType, originId, emailSendId },
    "Creating conversation with outbound message",
  );

  // Create conversation and outbound message in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the conversation
    const conversation = await tx.conversation.create({
      data: {
        workspaceId,
        contactId,
        senderIdentityId,
        sendingDomainId,
        originType,
        originId,
        originEmailSendId: emailSendId,
        subject,
        lastMessageAt: new Date(),
        messageCount: 1,
        unreadCount: 0, // Outbound message is not unread
        status: "OPEN",
      },
    });

    // Create the outbound message
    const inboxMessage = await tx.inboxMessage.create({
      data: {
        workspaceId,
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        emailSendId,
        fromEmail,
        fromName,
        toEmail,
        toName,
        subject,
        htmlBody,
        contentS3Key,
        messageId,
        status: "READ", // Outbound messages are always "read"
        sentAt: new Date(),
      },
    });

    return {
      conversationId: conversation.id,
      messageId: inboxMessage.id,
    };
  });

  logger.info(
    {
      conversationId: result.conversationId,
      messageId: result.messageId,
      emailSendId,
      originType,
    },
    "Conversation created with outbound message",
  );

  return result;
}

/**
 * Check if a sending domain has inbox enabled
 *
 * @param sendingDomainId - The sending domain ID
 * @returns True if inbox is enabled
 */
export async function isInboxEnabled(sendingDomainId: string): Promise<boolean> {
  const domain = await prisma.sendingDomain.findUnique({
    where: { id: sendingDomainId },
    select: { inboxEnabled: true },
  });

  return domain?.inboxEnabled ?? false;
}
