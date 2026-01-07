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
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          direction: true,
          subject: true,
          textBody: true,
          createdAt: true,
        },
      },
    },
  });

  const hasMore = conversations.length > limit;
  const items = hasMore ? conversations.slice(0, -1) : conversations;

  const data = items.map((c) => ({
    id: c.id,
    subject: c.subject,
    status: c.status,
    originType: c.originType,
    originId: c.originId,
    messageCount: c.messageCount,
    unreadCount: c.unreadCount,
    lastMessageAt: c.lastMessageAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
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
    lastMessage: c.messages[0]
      ? {
          id: c.messages[0].id,
          direction: c.messages[0].direction,
          subject: c.messages[0].subject,
          preview: c.messages[0].textBody?.slice(0, 200) || "",
          createdAt: c.messages[0].createdAt.toISOString(),
        }
      : null,
  }));

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

  return responseOk({
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    originType: conversation.originType,
    originId: conversation.originId,
    originEmailSendId: conversation.originEmailSendId,
    messageCount: conversation.messageCount,
    unreadCount: conversation.unreadCount,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    contact: conversation.contact
      ? {
          id: conversation.contact.id,
          email: conversation.contact.email,
          firstName: conversation.contact.firstName,
          lastName: conversation.contact.lastName,
        }
      : null,
    senderIdentity: conversation.senderIdentity
      ? {
          id: conversation.senderIdentity.id,
          email: conversation.senderIdentity.email,
          name: conversation.senderIdentity.name,
        }
      : null,
    sendingDomain: {
      id: conversation.sendingDomain.id,
      name: conversation.sendingDomain.name,
    },
    messages: conversation.messages.map((m) => ({
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
  });
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
