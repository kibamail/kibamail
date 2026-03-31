/**
 * Broadcasts Endpoints - Business Logic (External API)
 *
 * Handlers for managing broadcasts via external API
 * Uses API key authentication (withApiSession)
 * Workspace is deduced from the API key, not from URL parameters
 */

import type {
  Broadcast,
  BroadcastSendStatus,
  EmailContent,
  Prisma,
  SenderIdentity,
} from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";

/**
 * Sandbox email detection
 * Sandbox emails use the @kibamail.dev domain and auto-generate events
 */
const SANDBOX_DOMAIN = "kibamail.dev";

function isSandboxEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === SANDBOX_DOMAIN;
}

function parseSandboxEmail(email: string): { outcome: string; label: string | null } {
  const localPart = email.split("@")[0].toLowerCase();
  const [outcome, label] = localPart.split("+");
  return { outcome, label: label || null };
}
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import {
  type BroadcastDocument,
  type BroadcastStyles,
  renderBroadcastToHtml,
} from "@/lib/broadcast-renderer";
import {
  checkBroadcastReadiness,
  getReadinessErrors,
} from "@/lib/broadcasts/readiness";
import {
  resolveRecipients,
  resolveByEmails,
  type RecipientContact,
  type EmailOnlyRecipient,
} from "@/lib/broadcasts/recipient-resolver";
import { scheduleBroadcast as createBatchSchedule } from "@/lib/broadcasts/batch-scheduler";
import { prisma } from "@/lib/db";
import { htmlToPlainText } from "@/lib/email/html-to-text";
import { queue } from "@/lib/queue";
import {
  createAndSendBroadcastSchema,
  createBroadcastSchema,
  updateBroadcastSchema,
  type CreateAndSendBroadcastRequest,
} from "./schema";
import { dispatchWebhook } from "@/webhooks";

/**
 * Prepare email content data with auto-generated plain text.
 *
 * Generates plain text from HTML content if:
 * - HTML is provided (contentHtml) but text is not
 * - OR JSON is provided (contentJson) but text is not
 *
 * This ensures emails always have a text version for multipart/alternative.
 */
async function prepareEmailContentData(emailContent: {
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  previewText?: string | null;
  contentJson?: unknown;
  styles?: unknown;
}): Promise<Prisma.EmailContentCreateInput> {
  let contentText = emailContent.text ?? null;

  // Auto-generate plain text if not provided
  if (!contentText) {
    if (emailContent.html) {
      // Generate from provided HTML
      contentText = htmlToPlainText(emailContent.html);
    } else if (emailContent.contentJson) {
      // Render JSON to HTML first, then convert to text
      const html = await renderBroadcastToHtml(
        emailContent.contentJson as BroadcastDocument,
        {},
        (emailContent.styles as BroadcastStyles) ?? {},
      );
      contentText = htmlToPlainText(html);
    }
  }

  return {
    subject: emailContent.subject,
    contentText,
    contentHtml: emailContent.html,
    previewText: emailContent.previewText,
    contentJson: emailContent.contentJson as Prisma.InputJsonValue,
    styles: emailContent.styles as Prisma.InputJsonValue,
  };
}

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

  const senderIdentity = await prisma.senderIdentity.create({
    data: {
      workspaceId,
      name: localPart,
      email: localPart,
      sendingDomainId,
      emailVerifiedAt: new Date(),
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
    json: emailContent.contentJson ?? null,
    styles: emailContent.styles ?? null,
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
    updatedAt: broadcast.updatedAt.toISOString(),
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

  if (data.from) {
    const sendingDomain = await validateFromDomain(workspaceId, data.from);
    const senderIdentity = await getOrCreateSenderIdentity(
      workspaceId,
      data.from,
      sendingDomain.id,
    );

    senderIdentityId = senderIdentity.id;
    sendingDomainId = sendingDomain.id;

    if (data.replyTo && data.replyTo !== senderIdentity.replyToEmail) {
      await prisma.senderIdentity.update({
        where: { id: senderIdentity.id },
        data: { replyToEmail: data.replyTo },
      });
    }
  }

  let emailContentId: string | undefined;
  if (data.emailContent) {
    const emailContentData = await prepareEmailContentData(data.emailContent);
    const emailContent = await prisma.emailContent.create({
      data: emailContentData,
    });
    emailContentId = emailContent.id;
  }

  if (data.topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: data.topicId, workspaceId },
    });
    if (!topic) {
      throw new NotFoundError("Topic not found", ErrorCode.TOPIC_NOT_FOUND);
    }
  }

  if (data.segmentId) {
    const segment = await prisma.segment.findFirst({
      where: { id: data.segmentId, workspaceId },
    });
    if (!segment) {
      throw new NotFoundError("Segment not found", ErrorCode.SEGMENT_NOT_FOUND);
    }
  }

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

  // Dispatch webhook for broadcast creation
  await dispatchWebhook(workspaceId, "broadcast.created", {
    broadcastId: broadcast.id,
  });

  return responseCreated(formatBroadcast(broadcast), "broadcast");
}

/**
 * GET /api/v1/broadcasts
 *
 * List broadcasts for the workspace with cursor-based pagination.
 */
export async function listBroadcasts(
  workspaceId: string,
  request: NextRequest,
) {
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

  if (existingBroadcast.status !== "DRAFT") {
    throw new BadRequestError(
      "Only draft broadcasts can be updated",
      ErrorCode.BROADCAST_NOT_EDITABLE,
    );
  }

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.from !== undefined) {
    const sendingDomain = await validateFromDomain(workspaceId, data.from);
    const senderIdentity = await getOrCreateSenderIdentity(
      workspaceId,
      data.from,
      sendingDomain.id,
    );

    updateData.senderIdentityId = senderIdentity.id;
    updateData.sendingDomainId = sendingDomain.id;

    if (data.replyTo) {
      await prisma.senderIdentity.update({
        where: { id: senderIdentity.id },
        data: { replyToEmail: data.replyTo },
      });
    }
  } else if (data.replyTo !== undefined && existingBroadcast.senderIdentityId) {
    await prisma.senderIdentity.update({
      where: { id: existingBroadcast.senderIdentityId },
      data: { replyToEmail: data.replyTo },
    });
  }

  if (data.emailContent !== undefined) {
    if (data.emailContent === null) {
      updateData.emailContentId = null;
    } else if (existingBroadcast.emailContentId) {
      const emailContentData = await prepareEmailContentData(data.emailContent);
      await prisma.emailContent.update({
        where: { id: existingBroadcast.emailContentId },
        data: emailContentData,
      });
    } else {
      const emailContentData = await prepareEmailContentData(data.emailContent);
      const emailContent = await prisma.emailContent.create({
        data: emailContentData,
      });
      updateData.emailContentId = emailContent.id;
    }
  }

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

  if (data.sendAt !== undefined) {
    updateData.sendAt = data.sendAt;
  }

  if (data.trackClicks !== undefined) {
    updateData.trackClicks = data.trackClicks;
  }

  if (data.trackOpens !== undefined) {
    updateData.trackOpens = data.trackOpens;
  }

  if (data.replyToIdentityId !== undefined) {
    updateData.replyToIdentityId = data.replyToIdentityId;
  }

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
 * Only DRAFT or QUEUED broadcasts can be deleted.
 */
export async function deleteBroadcast(
  workspaceId: string,
  broadcastId: string,
) {
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

  const deletableStatuses = ["DRAFT", "QUEUED_FOR_SENDING"];
  if (!deletableStatuses.includes(broadcast.status)) {
    throw new BadRequestError(
      "Only draft or queued broadcasts can be deleted",
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
 * Performs readiness checks before scheduling.
 * Only DRAFT broadcasts can be sent.
 */
export async function scheduleBroadcast(workspaceId: string, broadcastId: string) {
  const broadcast = await prisma.broadcast.findFirst({
    where: {
      id: broadcastId,
      workspaceId,
    },
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: true,
        },
      },
      sendingDomain: true,
    },
  });

  if (!broadcast) {
    throw new NotFoundError(
      "Broadcast not found",
      ErrorCode.BROADCAST_NOT_FOUND,
    );
  }

  if (broadcast.status !== "DRAFT") {
    throw new BadRequestError(
      "Only draft broadcasts can be sent",
      ErrorCode.BROADCAST_NOT_EDITABLE,
    );
  }

  const readinessResult = await checkBroadcastReadiness(workspaceId, broadcast);

  if (!readinessResult.ready) {
    const errors = getReadinessErrors(readinessResult);
    throw new BadRequestError(
      errors.length > 0 ? errors[0] : "Broadcast is not ready to send",
      ErrorCode.MISSING_REQUIRED_FIELD,
    );
  }

  const updatedBroadcast = await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      status: "QUEUED_FOR_SENDING",
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

  if (!broadcast.sendAt) {
    throw new BadRequestError(
      "Broadcast send time is not set",
      ErrorCode.MISSING_REQUIRED_FIELD,
    );
  }

  const sendAt = new Date(broadcast.sendAt);
  const jobRunAt = new Date(sendAt.getTime() - 5 * 60 * 1000); // 5 minutes before
  const delay = Math.max(0, jobRunAt.getTime() - Date.now());

  await queue("broadcasts").push("send-broadcast", { broadcastId }, { delay });

  // Dispatch webhook for broadcast scheduled
  await dispatchWebhook(workspaceId, "broadcast.scheduled", {
    broadcastId,
    scheduledFor: sendAt.toISOString(),
  });

  return responseOk(formatBroadcast(updatedBroadcast), "broadcast");
}

/**
 * Process a sandbox broadcast
 *
 * Creates a broadcast record, BroadcastSend records, and queues sandbox processing jobs.
 * Sandbox broadcasts auto-generate events based on the email prefix (e.g., delivered@, bounced@).
 *
 * Note: BroadcastSend records are created with contactId=null since sandbox broadcasts
 * do not create contacts. This allows users to view recipient details on the broadcast page.
 */
async function processSandboxBroadcast(
  workspaceId: string,
  data: CreateAndSendBroadcastRequest,
  contacts: RecipientContact[],
) {
  // Create broadcast record (no sender identity/domain required for sandbox)
  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: data.name,
      status: "SENDING",
      sourceType: "API",
      emailContent: {
        create: {
          subject: data.emailContent.subject,
          contentHtml: data.emailContent.html,
          contentText: data.emailContent.text ?? null,
          previewText: data.emailContent.previewText ?? null,
        },
      },
    },
  });

  // Generate sendingIds and prepare BroadcastSend data
  const now = new Date();
  const recipientsWithSendingId = contacts.map((contact) => ({
    ...contact,
    sendingId: `bs_${createId()}`,
  }));

  // Create BroadcastSend records (contactId=null, no contacts created for sandbox)
  await prisma.broadcastSend.createMany({
    data: recipientsWithSendingId.map((r) => ({
      broadcastId: broadcast.id,
      workspaceId,
      contactId: null,
      email: r.email,
      sendingId: r.sendingId,
      variables: r.transientVariables || undefined,
      status: "QUEUED",
      queuedAt: now,
    })),
  });

  // Update broadcast aggregate with total queued count
  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { totalQueued: contacts.length },
  });

  // Queue sandbox processing job for each recipient
  const jobs = recipientsWithSendingId.map((contact) => {
    const { outcome, label } = parseSandboxEmail(contact.email);
    return {
      name: "process-sandbox-broadcast" as const,
      data: {
        broadcastId: broadcast.id,
        workspaceId,
        sendingId: contact.sendingId,
        email: contact.email,
        sandboxOutcome: outcome,
        sandboxLabel: label,
        subject: data.emailContent.subject,
        htmlBody: data.emailContent.html,
        textBody: data.emailContent.text,
        previewText: data.emailContent.previewText,
        transientVariables: contact.transientVariables,
      },
    };
  });

  await queue("broadcasts").pushBulk(jobs);

  return responseCreated({ id: broadcast.id }, "broadcast");
}

/**
 * POST /api/v1/broadcasts/create-and-send
 *
 * Create and immediately send a broadcast with raw HTML/text content.
 * Bypasses the JSON-based email editor.
 *
 * This function handles per-email variables by directly queuing batch jobs
 * with the resolved contacts (including transientVariables) instead of going
 * through the standard scheduleBroadcast flow which would lose the variables.
 *
 * @param workspaceId - The workspace ID from API key
 * @param request - Next.js request with broadcast data
 */
export async function createAndSendBroadcast(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(
    createAndSendBroadcastSchema,
    request,
  );

  // Determine if this is an email-only send (using emails array)
  const isEmailOnlySend = data.recipients.emails && data.recipients.emails.length > 0;

  // Check for sandbox emails FIRST (only when using emails recipient type)
  // This allows us to skip sendAt validation for sandbox broadcasts
  let isSandboxBroadcast = false;
  if (isEmailOnlySend) {
    const emails = data.recipients.emails!.map((e) =>
      typeof e === "string" ? e : e.email,
    );
    const sandboxEmails = emails.filter(isSandboxEmail);
    const realEmails = emails.filter((e) => !isSandboxEmail(e));

    // Reject mixed sandbox/real emails
    if (sandboxEmails.length > 0 && realEmails.length > 0) {
      throw new BadRequestError(
        "Cannot mix sandbox (@kibamail.dev) and real email addresses. Use only sandbox addresses for testing, or only real addresses for production sends.",
        ErrorCode.INVALID_PARAMETER,
      );
    }

    isSandboxBroadcast = sandboxEmails.length > 0;
  }

  // Skip sendAt validation for sandbox broadcasts (they process immediately)
  const sendAt = new Date(data.sendAt);
  if (!isSandboxBroadcast && sendAt <= new Date()) {
    throw new BadRequestError(
      "sendAt must be in the future",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  // Resolve recipients based on type (email-only vs contact-based)
  let contactIds: string[] = [];
  let contacts: RecipientContact[] = [];
  let emailOnlyRecipients: EmailOnlyRecipient[] = [];

  if (isEmailOnlySend) {
    // Email-only send: use resolveByEmails (does NOT create contacts)
    const resolution = resolveByEmails(data.recipients.emails!);
    emailOnlyRecipients = resolution.emails;

    if (emailOnlyRecipients.length === 0) {
      throw new BadRequestError(
        "No valid recipients found",
        ErrorCode.INVALID_PARAMETER,
      );
    }

    // Route to sandbox processing if applicable
    if (isSandboxBroadcast) {
      // For sandbox, we need to convert email-only recipients to contacts format
      const sandboxContacts: RecipientContact[] = emailOnlyRecipients.map((e, i) => ({
        id: `sandbox-${i}`, // Temporary ID for sandbox processing
        email: e.email,
        firstName: null,
        lastName: null,
        properties: {},
        transientVariables: e.variables,
      }));
      return processSandboxBroadcast(workspaceId, data, sandboxContacts);
    }
  } else {
    // Contact-based send: use resolveRecipients (contacts, segment, or topic)
    const resolution = await resolveRecipients(workspaceId, data.recipients);
    contactIds = resolution.contactIds;
    contacts = resolution.contacts;

    if (contactIds.length === 0) {
      throw new BadRequestError(
        "No valid recipients found",
        ErrorCode.INVALID_PARAMETER,
      );
    }

    // Route to sandbox processing if applicable (shouldn't happen for contact-based, but keep for safety)
    if (isSandboxBroadcast) {
      return processSandboxBroadcast(workspaceId, data, contacts);
    }
  }

  let senderIdentityId: string | undefined;
  let sendingDomainId: string | undefined;
  let replyToIdentityId: string | undefined;

  if (data.from) {
    const sendingDomain = await validateFromDomain(workspaceId, data.from);
    const senderIdentity = await getOrCreateSenderIdentity(
      workspaceId,
      data.from,
      sendingDomain.id,
    );

    senderIdentityId = senderIdentity.id;
    sendingDomainId = sendingDomain.id;

    if (data.replyTo) {
      replyToIdentityId = senderIdentity.id;
      if (data.replyTo !== senderIdentity.replyToEmail) {
        await prisma.senderIdentity.update({
          where: { id: senderIdentity.id },
          data: { replyToEmail: data.replyTo },
        });
      }
    }
  }

  const emailContent = await prisma.emailContent.create({
    data: {
      subject: data.emailContent.subject,
      contentText: data.emailContent.text ?? null,
      contentHtml: data.emailContent.html,
      previewText: data.emailContent.previewText ?? null,
    },
  });

  // Get the sending domain for limits
  const sendingDomain = await prisma.sendingDomain.findUnique({
    where: { id: sendingDomainId },
  });

  if (!sendingDomain) {
    throw new BadRequestError(
      "Sending domain not found",
      ErrorCode.BROADCAST_INVALID_FROM_DOMAIN,
    );
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: data.name,
      senderIdentityId,
      sendingDomainId,
      replyToIdentityId,
      emailContentId: emailContent.id,
      segmentId: data.recipients.segment ?? null,
      topicId: data.recipients.topic ?? null,
      sendAt,
      status: "QUEUED_FOR_SENDING",
      sourceType: "API",
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

  // Calculate delay until sendAt time (minus 5 minutes buffer for processing)
  const jobRunAt = new Date(sendAt.getTime() - 5 * 60 * 1000);
  const baseDelay = Math.max(0, jobRunAt.getTime() - Date.now());

  const batchQueue = queue("broadcasts");

  if (isEmailOnlySend) {
    // Email-only send: create batch jobs with email-only recipients
    // For simplicity, create synthetic IDs for batching (using email as ID)
    const emailIds = emailOnlyRecipients.map((e) => e.email);
    const schedule = createBatchSchedule(emailIds, {
      maxSendPerDay: sendingDomain.maxSendPerDay,
      maxSendPerHour: sendingDomain.maxSendPerHour,
    });

    const batchJobs = schedule.batches.map((batch) => {
      // Get emails for this batch
      const batchEmails = emailOnlyRecipients.filter((e) =>
        batch.contactIds.includes(e.email),
      );

      return {
        name: "send-broadcast-batch-emails" as const,
        data: {
          broadcastId: broadcast.id,
          batchId: batch.batchId,
          emails: batchEmails,
        },
        options: {
          delay: baseDelay + batch.delayMs,
        },
      };
    });

    await batchQueue.pushBulk(batchJobs);
  } else {
    // Contact-based send: use existing batch job with contacts
    const schedule = createBatchSchedule(contactIds, {
      maxSendPerDay: sendingDomain.maxSendPerDay,
      maxSendPerHour: sendingDomain.maxSendPerHour,
    });

    const batchJobs = schedule.batches.map((batch) => {
      const batchContactIds = batch.contactIds;
      // Filter contacts for this batch, preserving transientVariables
      const batchContacts = contacts.filter((c) => batchContactIds.includes(c.id));

      return {
        name: "send-broadcast-batch" as const,
        data: {
          broadcastId: broadcast.id,
          batchId: batch.batchId,
          contactIds: batchContactIds,
          contacts: batchContacts,
        },
        options: {
          delay: baseDelay + batch.delayMs,
        },
      };
    });

    await batchQueue.pushBulk(batchJobs);
  }

  return responseCreated({ id: broadcast.id }, "broadcast");
}

/**
 * Format a BroadcastSend for API response
 */
function formatBroadcastSend(send: {
  id: string;
  email: string;
  contactId: string | null;
  status: string;
  queuedAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  firstOpenedAt: Date | null;
  firstClickedAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  openCount: number;
  clickCount: number;
  uniqueLinksClicked: number;
  bounceClassification: string | null;
  lastResponseCode: number | null;
  lastResponseMessage: string | null;
}) {
  return {
    id: send.id,
    email: send.email,
    contactId: send.contactId,
    status: send.status,
    queuedAt: send.queuedAt.toISOString(),
    sentAt: send.sentAt?.toISOString() ?? null,
    deliveredAt: send.deliveredAt?.toISOString() ?? null,
    firstOpenedAt: send.firstOpenedAt?.toISOString() ?? null,
    firstClickedAt: send.firstClickedAt?.toISOString() ?? null,
    bouncedAt: send.bouncedAt?.toISOString() ?? null,
    complainedAt: send.complainedAt?.toISOString() ?? null,
    openCount: send.openCount,
    clickCount: send.clickCount,
    uniqueLinksClicked: send.uniqueLinksClicked,
    bounceClassification: send.bounceClassification,
    lastResponseCode: send.lastResponseCode,
    lastResponseMessage: send.lastResponseMessage,
  };
}

/**
 * Round a number to a specified number of decimal places
 */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * GET /api/v1/broadcasts/[broadcastId]/sends
 *
 * List all sends for a broadcast with cursor-based pagination.
 * Optionally filter by status.
 */
export async function listBroadcastSends(
  workspaceId: string,
  broadcastId: string,
  request: NextRequest,
) {
  // Verify broadcast exists and belongs to workspace
  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, workspaceId },
  });

  if (!broadcast) {
    throw new NotFoundError(
      "Broadcast not found",
      ErrorCode.BROADCAST_NOT_FOUND,
    );
  }

  // Check if details have been pruned
  if (broadcast.detailsPruned) {
    throw new BadRequestError(
      "Send details for this broadcast have been pruned. Only aggregate statistics are available via the /stats endpoint.",
      ErrorCode.BROADCAST_DETAILS_PRUNED,
    );
  }

  // Parse pagination and filter params
  const { limit, after, before } = parseCursorPaginationParams(request);
  const status = request.nextUrl.searchParams.get("status");

  // Build where clause
  const whereClause: { broadcastId: string; status?: BroadcastSendStatus } = { broadcastId };
  if (status) {
    whereClause.status = status as BroadcastSendStatus;
  }

  // Build base query
  const baseQuery = {
    where: whereClause,
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  // Fetch sends with pagination
  const sends = after
    ? await prisma.broadcastSend.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.broadcastSend.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.broadcastSend.findMany(baseQuery);

  const hasMore = sends.length > limit;
  const items = hasMore ? sends.slice(0, -1) : sends;

  if (before) {
    items.reverse();
  }

  const formattedSends = items.map(formatBroadcastSend);

  const paginatedResponse = createCursorPaginatedResponse(
    formattedSends,
    hasMore,
    "broadcast_send_list",
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/broadcasts/[broadcastId]/stats
 *
 * Get aggregate statistics for a broadcast.
 * Returns counts, rates, and engagement metrics.
 */
export async function getBroadcastStats(
  workspaceId: string,
  broadcastId: string,
) {
  // Fetch broadcast with aggregate stats
  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, workspaceId },
  });

  if (!broadcast) {
    throw new NotFoundError(
      "Broadcast not found",
      ErrorCode.BROADCAST_NOT_FOUND,
    );
  }

  // Calculate rates (avoid division by zero)
  const totalSent = broadcast.totalSent || 0;
  const totalDelivered = broadcast.totalDelivered || 0;
  const totalOpened = broadcast.totalOpened || 0;

  const openRate = totalDelivered > 0 ? totalOpened / totalDelivered : 0;
  const clickRate = totalDelivered > 0 ? broadcast.totalClicked / totalDelivered : 0;
  const clickToOpenRate = totalOpened > 0 ? broadcast.totalClicked / totalOpened : 0;
  const deliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;
  const bounceRate = totalSent > 0 ? broadcast.totalBounced / totalSent : 0;
  const complaintRate = totalDelivered > 0 ? broadcast.totalComplained / totalDelivered : 0;

  return responseOk(
    {
      broadcastId: broadcast.id,
      recipients: {
        total: broadcast.totalQueued,
        queued: broadcast.totalQueued - broadcast.totalSent,
        sent: broadcast.totalSent,
        delivered: broadcast.totalDelivered,
        bounced: broadcast.totalBounced,
        complained: broadcast.totalComplained,
        failed: broadcast.totalFailed,
        unsubscribed: broadcast.totalUnsubscribed,
      },
      engagement: {
        opened: broadcast.totalOpened,
        clicked: broadcast.totalClicked,
        openRate: round(openRate, 4),
        clickRate: round(clickRate, 4),
        clickToOpenRate: round(clickToOpenRate, 4),
      },
      deliverability: {
        deliveryRate: round(deliveryRate, 4),
        bounceRate: round(bounceRate, 4),
        complaintRate: round(complaintRate, 4),
      },
      detailsPruned: broadcast.detailsPruned,
    },
    "broadcast_stats",
  );
}
