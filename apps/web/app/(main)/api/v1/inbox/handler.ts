/**
 * Inbox Endpoints - Business Logic (External API)
 *
 * Handlers for managing inbox conversations and messages via external API
 * Uses API key authentication (withApiSession)
 */

import { ConversationStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { NotFoundError } from "@/lib/api/errors";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseNoContent, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import { sendReplySchema, updateConversationSchema } from "./schema";

/**
 * Format a conversation for API response.
 * Shared between list and detail endpoints.
 */
function formatConversation(c: {
  id: string;
  subject: string;
  status: string;
  originType: string;
  originId: string | null;
  originEmailSendId: string | null;
  messageCount: number;
  unreadCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  senderIdentity: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  sendingDomain: {
    id: string;
    name: string;
  };
  messages: Array<{
    id: string;
    direction: string;
    emailSendId: string | null;
    fromEmail: string;
    fromName: string | null;
    toEmail: string;
    toName: string | null;
    subject: string | null;
    textBody: string | null;
    htmlBody: string | null;
    status: string;
    receivedAt: Date | null;
    sentAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
    attachments: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
      isInline: boolean;
    }>;
  }>;
}) {
  return {
    id: c.id,
    subject: c.subject,
    status: c.status,
    originType: c.originType,
    originId: c.originId,
    originEmailSendId: c.originEmailSendId,
    messageCount: c.messageCount,
    unreadCount: c.unreadCount,
    lastMessageAt: c.lastMessageAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    contact: c.contact
      ? {
          id: c.contact.id,
          email: c.contact.email,
          firstName: c.contact.firstName,
          lastName: c.contact.lastName,
        }
      : null,
    senderIdentity: c.senderIdentity
      ? {
          id: c.senderIdentity.id,
          email: c.senderIdentity.email,
          name: c.senderIdentity.name,
        }
      : null,
    sendingDomain: {
      id: c.sendingDomain.id,
      name: c.sendingDomain.name,
    },
    messages: c.messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      emailSendId: m.emailSendId,
      fromEmail: m.fromEmail,
      fromName: m.fromName,
      toEmail: m.toEmail,
      toName: m.toName,
      subject: m.subject,
      textBody: m.textBody,
      htmlBody: m.htmlBody,
      status: m.status,
      receivedAt: m.receivedAt?.toISOString() || null,
      sentAt: m.sentAt?.toISOString() || null,
      readAt: m.readAt?.toISOString() || null,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        isInline: a.isInline,
      })),
    })),
  };
}

/**
 * List conversations with pagination
 */
export async function listConversations(
  workspaceId: string,
  request: NextRequest,
) {
  const { limit, after } = parseCursorPaginationParams(request);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ConversationStatus | null;

  const where = {
    workspaceId,
    ...(status ? { status } : {}),
  };

  const conversations = await prisma.conversation.findMany({
    where,
    take: limit + 1, // Fetch one extra to check for next page
    ...(after ? { cursor: { id: after }, skip: 1 } : {}),
    orderBy: { lastMessageAt: "desc" },
    include: {
      contact: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      senderIdentity: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      sendingDomain: {
        select: {
          id: true,
          name: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          attachments: {
            select: {
              id: true,
              filename: true,
              contentType: true,
              size: true,
              isInline: true,
            },
          },
        },
      },
    },
  });

  const hasMore = conversations.length > limit;
  const items = hasMore ? conversations.slice(0, -1) : conversations;

  const data = items.map(formatConversation);

  return responseOk(
    createCursorPaginatedResponse(data, hasMore, "conversation_list"),
  );
}

/**
 * Get a single conversation with all messages
 */
export async function getConversation(
  workspaceId: string,
  conversationId: string,
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    include: {
      contact: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      senderIdentity: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      sendingDomain: {
        select: {
          id: true,
          name: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          attachments: {
            select: {
              id: true,
              filename: true,
              contentType: true,
              size: true,
              isInline: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new NotFoundError(
      `Conversation ${conversationId} not found`,
      ErrorCode.ConversationNotFound,
    );
  }

  return responseOk(formatConversation(conversation));
}

/**
 * Update a conversation (status, etc.)
 */
export async function updateConversation(
  workspaceId: string,
  conversationId: string,
  request: NextRequest,
) {
  const body = await validateRequestBody(updateConversationSchema, request);

  // Verify conversation exists and belongs to workspace
  const existing = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError(
      `Conversation ${conversationId} not found`,
      ErrorCode.ConversationNotFound,
    );
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(body.status ? { status: body.status } : {}),
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  return responseOk({
    id: updated.id,
    status: updated.status,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

/**
 * Send a reply to a conversation
 */
export async function sendReply(
  workspaceId: string,
  conversationId: string,
  request: NextRequest,
) {
  const body = await validateRequestBody(sendReplySchema, request);

  // Verify conversation exists and belongs to workspace
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    select: {
      id: true,
      contactId: true,
      senderIdentityId: true,
    },
  });

  if (!conversation) {
    throw new NotFoundError(
      `Conversation ${conversationId} not found`,
      ErrorCode.ConversationNotFound,
    );
  }

  if (!conversation.contactId || !conversation.senderIdentityId) {
    throw new NotFoundError(
      `Conversation ${conversationId} cannot receive replies (no contact or sender identity)`,
      ErrorCode.ConversationNotFound,
    );
  }

  // Queue the reply for sending
  await queue("inbox").push("send-reply", {
    conversationId,
    replyContent: body.content,
    replySubject: body.subject,
  });

  return responseCreated({
    status: "queued",
    conversationId,
  });
}

/**
 * Get inbox statistics (unread counts, etc.)
 */
export async function getStats(workspaceId: string) {
  const [totalConversations, unreadConversations, openConversations] =
    await Promise.all([
      prisma.conversation.count({ where: { workspaceId } }),
      prisma.conversation.count({
        where: { workspaceId, unreadCount: { gt: 0 } },
      }),
      prisma.conversation.count({
        where: { workspaceId, status: "OPEN" },
      }),
    ]);

  return responseOk({
    totalConversations,
    unreadConversations,
    openConversations,
  });
}

/**
 * Mark messages in a conversation as read
 */
export async function markAsRead(
  workspaceId: string,
  conversationId: string,
) {
  // Verify conversation exists and belongs to workspace
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    select: { id: true, unreadCount: true },
  });

  if (!conversation) {
    throw new NotFoundError(
      `Conversation ${conversationId} not found`,
      ErrorCode.ConversationNotFound,
    );
  }

  // Update all unread messages to read and reset conversation unread count
  await prisma.$transaction([
    prisma.inboxMessage.updateMany({
      where: {
        conversationId,
        status: "UNREAD",
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    }),
  ]);

  return responseNoContent();
}
