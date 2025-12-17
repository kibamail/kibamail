/**
 * Broadcasts Endpoints - Business Logic (External API)
 *
 * Handlers for managing broadcasts via external API
 * Uses API key authentication (withApiSession)
 * Workspace is deduced from the API key, not from URL parameters
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Broadcast, EmailContent, SenderIdentity } from "@prisma/client";
import { ErrorCode } from "@/lib/api/error-codes";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  createBroadcastSchema,
  sendBroadcastSchema,
  updateBroadcastSchema,
} from "./schema";

/**
 * Parse email into local part and domain
 */
function parseEmail(email: string): { localPart: string; domain: string } {
  const [localPart, domain] = email.split("@");
  return { localPart, domain };
}

/**
 * Get or create a sender identity for the given email and domain
 * Auto-verifies the sender identity if created
 */
async function getOrCreateSenderIdentity(
  workspaceId: string,
  fromEmail: string,
  sendingDomainId: string,
): Promise<SenderIdentity> {
  const { localPart } = parseEmail(fromEmail);

  // Check if sender identity already exists
  const existingSenderIdentity = await prisma.senderIdentity.findFirst({
    where: {
      workspaceId,
      email: localPart,
      sendingDomainId,
    },
  });

  if (existingSenderIdentity) {
    return existingSenderIdentity;
  }

  // Create new sender identity with auto-verification
  const senderIdentity = await prisma.senderIdentity.create({
    data: {
      workspaceId,
      name: localPart, // Use local part as default name
      email: localPart,
      sendingDomainId,
      emailVerifiedAt: new Date(), // Auto-verify
    },
  });

  return senderIdentity;
}

/**
 * Validate that the domain in the from email exists in the workspace
 * Returns the SendingDomain if valid
 */
async function validateFromDomain(workspaceId: string, fromEmail: string) {
  const { domain } = parseEmail(fromEmail);

  const sendingDomain = await prisma.sendingDomain.findFirst({
    where: {
      workspaceId,
      name: domain,
    },
  });

  if (!sendingDomain) {
    throw new BadRequestError(
      `Domain "${domain}" is not registered in your workspace. Please add the domain first.`,
      ErrorCode.BROADCAST_INVALID_FROM_DOMAIN,
    );
  }

  return sendingDomain;
}

/**
 * Format email content for API response
 */
function formatEmailContent(emailContent: EmailContent | null) {
  if (!emailContent) {
    return null;
  }

  return {
    subject: emailContent.subject ?? null,
    text: emailContent.contentText ?? null,
    html: emailContent.contentHtml ?? null,
    previewText: emailContent.previewText ?? null,
  };
}

/**
 * Format a broadcast for API response
 */
function formatBroadcast(
  broadcast: Broadcast & {
    emailContent: EmailContent | null;
    senderIdentity:
      | (SenderIdentity & { sendingDomain: { name: string } })
      | null;
  },
) {
  // Reconstruct the from email from sender identity
  let from: string | null = null;
  if (broadcast.senderIdentity) {
    from = `${broadcast.senderIdentity.email}@${broadcast.senderIdentity.sendingDomain.name}`;
  }

  return {
    id: broadcast.id,
    name: broadcast.name,
    status: broadcast.status,
    from,
    emailContent: formatEmailContent(broadcast.emailContent),
    replyTo: broadcast.senderIdentity?.replyToEmail ?? null,
    topicId: broadcast.topicId,
    segmentId: broadcast.segmentId,
    sendAt: broadcast.sendAt?.toISOString() ?? null,
    createdAt: broadcast.createdAt.toISOString(),
  };
}

/**
 * POST /api/v1/broadcasts
 *
 * Create a new broadcast for the workspace.
 * If 'from' is provided, validates the domain and creates/reuses sender identity.
 * Creates email content with subject if provided.
 */
export async function createBroadcast(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(createBroadcastSchema, request);

  let senderIdentityId: string | undefined;
  let sendingDomainId: string | undefined;

  // Handle 'from' field if provided
  if (data.from) {
    const sendingDomain = await validateFromDomain(workspaceId, data.from);
    const senderIdentity = await getOrCreateSenderIdentity(
      workspaceId,
      data.from,
      sendingDomain.id,
    );

    senderIdentityId = senderIdentity.id;
    sendingDomainId = sendingDomain.id;

    // Update replyTo on sender identity if provided
    if (data.replyTo && data.replyTo !== senderIdentity.replyToEmail) {
      await prisma.senderIdentity.update({
        where: { id: senderIdentity.id },
        data: { replyToEmail: data.replyTo },
      });
    }
  }

  // Create email content if emailContent object is provided
  let emailContentId: string | undefined;
  if (data.emailContent) {
    const emailContent = await prisma.emailContent.create({
      data: {
        subject: data.emailContent.subject,
        contentText: data.emailContent.text,
        contentHtml: data.emailContent.html,
        previewText: data.emailContent.previewText,
      },
    });
    emailContentId = emailContent.id;
  }

  // Validate topicId if provided
  if (data.topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: data.topicId, workspaceId },
    });
    if (!topic) {
      throw new NotFoundError("Topic not found", ErrorCode.TOPIC_NOT_FOUND);
    }
  }

  // Validate segmentId if provided
  if (data.segmentId) {
    const segment = await prisma.segment.findFirst({
      where: { id: data.segmentId, workspaceId },
    });
    if (!segment) {
      throw new NotFoundError("Segment not found", ErrorCode.SEGMENT_NOT_FOUND);
    }
  }

  // Create the broadcast
  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: data.name,
      senderIdentityId,
      sendingDomainId,
      emailContentId,
      topicId: data.topicId,
      segmentId: data.segmentId,
    },
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: {
            select: { name: true },
          },
        },
      },
    },
  });

  return responseCreated(formatBroadcast(broadcast), "broadcast");
}

/**
 * GET /api/v1/broadcasts
 *
 * List broadcasts for the workspace with cursor-based pagination.
 */
export async function listBroadcasts(workspaceId: string, request: NextRequest) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: { workspaceId },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: {
            select: { name: true },
          },
        },
      },
    },
  };

  const broadcasts = after
    ? await prisma.broadcast.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.broadcast.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.broadcast.findMany(baseQuery);

  const hasMore = broadcasts.length > limit;
  const items = hasMore ? broadcasts.slice(0, -1) : broadcasts;

  if (before) {
    items.reverse();
  }

  const formattedBroadcasts = items.map(formatBroadcast);

  const paginatedResponse = createCursorPaginatedResponse(
    formattedBroadcasts,
    hasMore,
    "broadcast_list",
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/broadcasts/[broadcastId]
 *
 * Get a specific broadcast by ID.
 */
export async function getBroadcast(workspaceId: string, broadcastId: string) {
  const broadcast = await prisma.broadcast.findFirst({
    where: {
      id: broadcastId,
      workspaceId,
    },
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!broadcast) {
    throw new NotFoundError(
      "Broadcast not found",
      ErrorCode.BROADCAST_NOT_FOUND,
    );
  }

  return responseOk(formatBroadcast(broadcast), "broadcast");
}

/**
 * PUT /api/v1/broadcasts/[broadcastId]
 *
 * Update a specific broadcast by ID.
 * Only DRAFT broadcasts can be updated.
 */
export async function updateBroadcast(
  workspaceId: string,
  broadcastId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateBroadcastSchema, request);

  // Get existing broadcast
  const existingBroadcast = await prisma.broadcast.findFirst({
    where: {
      id: broadcastId,
      workspaceId,
    },
    include: {
      emailContent: true,
      senderIdentity: true,
    },
  });

  if (!existingBroadcast) {
    throw new NotFoundError(
      "Broadcast not found",
      ErrorCode.BROADCAST_NOT_FOUND,
    );
  }

  // Only allow updates on DRAFT broadcasts
  if (existingBroadcast.status !== "DRAFT") {
    throw new BadRequestError(
      "Only draft broadcasts can be updated",
      ErrorCode.BROADCAST_NOT_EDITABLE,
    );
  }

  const updateData: Record<string, unknown> = {};

  // Update name if provided
  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  // Handle 'from' field if provided
  if (data.from !== undefined) {
    const sendingDomain = await validateFromDomain(workspaceId, data.from);
    const senderIdentity = await getOrCreateSenderIdentity(
      workspaceId,
      data.from,
      sendingDomain.id,
    );

    updateData.senderIdentityId = senderIdentity.id;
    updateData.sendingDomainId = sendingDomain.id;

    // Update replyTo on sender identity if provided
    if (data.replyTo) {
      await prisma.senderIdentity.update({
        where: { id: senderIdentity.id },
        data: { replyToEmail: data.replyTo },
      });
    }
  } else if (data.replyTo !== undefined && existingBroadcast.senderIdentityId) {
    // Update replyTo on existing sender identity
    await prisma.senderIdentity.update({
      where: { id: existingBroadcast.senderIdentityId },
      data: { replyToEmail: data.replyTo },
    });
  }

  // Handle emailContent update
  if (data.emailContent !== undefined) {
    if (data.emailContent === null) {
      // Clear email content
      updateData.emailContentId = null;
    } else if (existingBroadcast.emailContentId) {
      // Update existing email content
      await prisma.emailContent.update({
        where: { id: existingBroadcast.emailContentId },
        data: {
          subject: data.emailContent.subject,
          contentText: data.emailContent.text,
          contentHtml: data.emailContent.html,
          previewText: data.emailContent.previewText,
        },
      });
    } else {
      // Create new email content
      const emailContent = await prisma.emailContent.create({
        data: {
          subject: data.emailContent.subject,
          contentText: data.emailContent.text,
          contentHtml: data.emailContent.html,
          previewText: data.emailContent.previewText,
        },
      });
      updateData.emailContentId = emailContent.id;
    }
  }

  // Handle topicId update
  if (data.topicId !== undefined) {
    if (data.topicId === null) {
      updateData.topicId = null;
    } else {
      const topic = await prisma.topic.findFirst({
        where: { id: data.topicId, workspaceId },
      });
      if (!topic) {
        throw new NotFoundError("Topic not found", ErrorCode.TOPIC_NOT_FOUND);
      }
      updateData.topicId = data.topicId;
    }
  }

  // Handle segmentId update
  if (data.segmentId !== undefined) {
    if (data.segmentId === null) {
      updateData.segmentId = null;
    } else {
      const segment = await prisma.segment.findFirst({
        where: { id: data.segmentId, workspaceId },
      });
      if (!segment) {
        throw new NotFoundError(
          "Segment not found",
          ErrorCode.SEGMENT_NOT_FOUND,
        );
      }
      updateData.segmentId = data.segmentId;
    }
  }

  // Update the broadcast
  const updatedBroadcast = await prisma.broadcast.update({
    where: { id: broadcastId },
    data: updateData,
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: {
            select: { name: true },
          },
        },
      },
    },
  });

  return responseOk(formatBroadcast(updatedBroadcast), "broadcast");
}

/**
 * DELETE /api/v1/broadcasts/[broadcastId]
 *
 * Delete a specific broadcast by ID.
 * Only DRAFT broadcasts can be deleted.
 */
export async function deleteBroadcast(workspaceId: string, broadcastId: string) {
  const broadcast = await prisma.broadcast.findFirst({
    where: {
      id: broadcastId,
      workspaceId,
    },
  });

  if (!broadcast) {
    throw new NotFoundError(
      "Broadcast not found",
      ErrorCode.BROADCAST_NOT_FOUND,
    );
  }

  // Only allow deletion of DRAFT broadcasts
  if (broadcast.status !== "DRAFT") {
    throw new BadRequestError(
      "Only draft broadcasts can be deleted",
      ErrorCode.BROADCAST_NOT_EDITABLE,
    );
  }

  const deletedBroadcast = await prisma.broadcast.delete({
    where: { id: broadcastId },
  });

  return responseOk(
    {
      id: deletedBroadcast.id,
    },
    "broadcast",
  );
}

/**
 * POST /api/v1/broadcasts/[broadcastId]/send
 *
 * Schedule a broadcast for sending.
 * Validates that the broadcast has all required fields before scheduling.
 * Only DRAFT broadcasts can be sent.
 */
export async function sendBroadcast(
  workspaceId: string,
  broadcastId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(sendBroadcastSchema, request);

  // Get the broadcast with all related data
  const broadcast = await prisma.broadcast.findFirst({
    where: {
      id: broadcastId,
      workspaceId,
    },
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!broadcast) {
    throw new NotFoundError(
      "Broadcast not found",
      ErrorCode.BROADCAST_NOT_FOUND,
    );
  }

  // Only allow sending DRAFT broadcasts
  if (broadcast.status !== "DRAFT") {
    throw new BadRequestError(
      "Only draft broadcasts can be sent",
      ErrorCode.BROADCAST_NOT_EDITABLE,
    );
  }

  // Validate required fields for sending
  // These validations can be extended later as mentioned by user
  if (!broadcast.senderIdentityId || !broadcast.senderIdentity) {
    throw new BadRequestError(
      "Broadcast must have a sender (from) configured before sending",
      ErrorCode.MISSING_REQUIRED_FIELD,
    );
  }

  if (!broadcast.emailContentId || !broadcast.emailContent) {
    throw new BadRequestError(
      "Broadcast must have email content before sending",
      ErrorCode.MISSING_REQUIRED_FIELD,
    );
  }

  if (!broadcast.emailContent.subject) {
    throw new BadRequestError(
      "Broadcast must have a subject before sending",
      ErrorCode.MISSING_REQUIRED_FIELD,
    );
  }

  // Update the broadcast status to QUEUED_FOR_SENDING and set sendAt
  const updatedBroadcast = await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      status: "QUEUED_FOR_SENDING",
      sendAt: data.sendAt,
    },
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: {
            select: { name: true },
          },
        },
      },
    },
  });

  return responseOk(formatBroadcast(updatedBroadcast), "broadcast");
}
