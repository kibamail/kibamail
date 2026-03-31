/**
 * Transactional Emails Endpoints - Business Logic (External API)
 *
 * Handlers for managing transactional email records via external API
 * Uses API key authentication (withApiSession)
 * Workspace is deduced from the API key, not from URL parameters
 */

import type { Prisma, TransactionalEmailStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { NotFoundError } from "@/lib/api/errors";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import { downloadPrivateFile } from "@/lib/storage";

/**
 * Format a transactional email for API response.
 * Shared between list and detail endpoints.
 */
function formatEmail(email: {
  id: string;
  sendingId: string;
  fromEmail: string;
  fromName: string | null;
  replyToEmail: string | null;
  replyToName: string | null;
  toEmail: string;
  subject: string;
  previewText: string | null;
  status: string;
  lastResponseCode: number | null;
  lastResponseMessage: string | null;
  bounceClassification: string | null;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  metadata: unknown;
  tags: unknown;
  openCount: number;
  clickCount: number;
  uniqueLinksClicked: number;
  totalEvents: number;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  firstOpenedAt: Date | null;
  firstClickedAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
}) {
  return {
    id: email.id,
    sendingId: email.sendingId,
    from: {
      email: email.fromEmail,
      name: email.fromName,
    },
    replyTo: email.replyToEmail
      ? {
          email: email.replyToEmail,
          name: email.replyToName,
        }
      : null,
    to: email.toEmail,
    subject: email.subject,
    previewText: email.previewText,
    status: email.status.toLowerCase(),
    lastResponseCode: email.lastResponseCode,
    lastResponseMessage: email.lastResponseMessage,
    bounceClassification: email.bounceClassification,
    openTrackingEnabled: email.openTrackingEnabled,
    clickTrackingEnabled: email.clickTrackingEnabled,
    metadata: email.metadata || null,
    tags: (email.tags as string[]) || null,
    openCount: email.openCount,
    clickCount: email.clickCount,
    uniqueLinksClicked: email.uniqueLinksClicked,
    totalEvents: email.totalEvents,
    createdAt: email.createdAt.toISOString(),
    sentAt: email.sentAt?.toISOString() || null,
    deliveredAt: email.deliveredAt?.toISOString() || null,
    firstOpenedAt: email.firstOpenedAt?.toISOString() || null,
    firstClickedAt: email.firstClickedAt?.toISOString() || null,
    bouncedAt: email.bouncedAt?.toISOString() || null,
    complainedAt: email.complainedAt?.toISOString() || null,
  };
}

/**
 * Parse query parameters specific to transactional emails
 */
function parseEmailQueryParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  return {
    status: searchParams.get("status") as TransactionalEmailStatus | null,
    to: searchParams.get("to"),
    subject: searchParams.get("subject"),
    fromDate: searchParams.get("from_date"),
    toDate: searchParams.get("to_date"),
  };
}

/**
 * GET /api/v1/emails
 *
 * List transactional emails for the workspace with cursor-based pagination.
 * Supports filtering by status, recipient, subject, and date range.
 */
export async function listTransactionalEmails(
  workspaceId: string,
  request: NextRequest
) {
  const { limit, after, before } = parseCursorPaginationParams(request);
  const { status, to, subject, fromDate, toDate } = parseEmailQueryParams(request);

  const where: Prisma.TransactionalEmailWhereInput = { workspaceId };

  if (status) {
    where.status = status;
  }

  if (to) {
    where.toEmail = {
      contains: to,
      mode: "insensitive",
    };
  }

  if (subject) {
    where.subject = {
      contains: subject,
      mode: "insensitive",
    };
  }

  if (fromDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) || {}),
      gte: new Date(fromDate),
    };
  }

  if (toDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) || {}),
      lte: new Date(toDate),
    };
  }

  const baseQuery = {
    where,
    orderBy: before
      ? ({ createdAt: "asc" } as const)
      : ({ createdAt: "desc" } as const),
    take: limit + 1,
    select: {
      id: true,
      sendingId: true,
      fromEmail: true,
      fromName: true,
      replyToEmail: true,
      replyToName: true,
      toEmail: true,
      subject: true,
      previewText: true,
      status: true,
      lastResponseCode: true,
      lastResponseMessage: true,
      bounceClassification: true,
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      metadata: true,
      tags: true,
      openCount: true,
      clickCount: true,
      uniqueLinksClicked: true,
      totalEvents: true,
      createdAt: true,
      sentAt: true,
      deliveredAt: true,
      firstOpenedAt: true,
      firstClickedAt: true,
      bouncedAt: true,
      complainedAt: true,
    },
  };

  const emails = after
    ? await prisma.transactionalEmail.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.transactionalEmail.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.transactionalEmail.findMany(baseQuery);

  const hasMore = emails.length > limit;
  const items = hasMore ? emails.slice(0, -1) : emails;

  if (before) {
    items.reverse();
  }

  const formattedEmails = items.map(formatEmail);

  const paginatedResponse = createCursorPaginatedResponse(
    formattedEmails,
    hasMore,
    "transactional_email_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/emails/[emailId]
 *
 * Get a specific transactional email by ID.
 * Returns full email metadata including tracking config and stats.
 */
export async function getTransactionalEmail(
  workspaceId: string,
  emailId: string
) {
  const email = await prisma.transactionalEmail.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
  });

  if (!email) {
    throw new NotFoundError("Email not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  return responseOk(formatEmail(email), "transactional_email");
}

/**
 * GET /api/v1/emails/[emailId]/events
 *
 * Get all events for a specific transactional email (timeline).
 * Events are ordered chronologically (oldest first).
 */
export async function getTransactionalEmailEvents(
  workspaceId: string,
  emailId: string
) {
  const email = await prisma.transactionalEmail.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
    select: {
      sendingId: true,
    },
  });

  if (!email) {
    throw new NotFoundError("Email not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  const events = await prisma.event.findMany({
    where: {
      sendingId: email.sendingId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      type: true,
      createdAt: true,
      responseCode: true,
      responseContent: true,
      responseCommand: true,
      bounceClassification: true,
      originCountry: true,
      originCity: true,
      originDevice: true,
      originBrowser: true,
      peerAddressName: true,
    },
  });

  const formattedEvents = events.map((event) => ({
    id: event.id,
    type: event.type,
    timestamp: event.createdAt.toISOString(),
    response:
      event.responseCode !== null
        ? {
            code: event.responseCode,
            content: event.responseContent,
            command: event.responseCommand,
          }
        : null,
    bounceClassification: event.bounceClassification,
    origin:
      event.originCountry || event.originDevice
        ? {
            country: event.originCountry,
            city: event.originCity,
            device: event.originDevice,
            browser: event.originBrowser,
          }
        : null,
    server: event.peerAddressName,
  }));

  return responseOk(
    {
      emailId,
      sendingId: email.sendingId,
      events: formattedEvents,
    },
    "event_list"
  );
}

/**
 * Download content from S3
 */
async function downloadS3Content(s3Key: string | null): Promise<string | null> {
  if (!s3Key) return null;

  try {
    const file = await downloadPrivateFile(s3Key);
    const contentString = await file.body?.transformToString();
    return contentString || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/emails/[emailId]/content
 *
 * Get the email content (HTML and text) from S3 storage.
 */
export async function getTransactionalEmailContent(
  workspaceId: string,
  emailId: string
) {
  const email = await prisma.transactionalEmail.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
    select: {
      htmlContentS3Key: true,
      textContentS3Key: true,
    },
  });

  if (!email) {
    throw new NotFoundError("Email not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  if (!email.htmlContentS3Key && !email.textContentS3Key) {
    throw new NotFoundError(
      "Email content not available",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  const [html, text] = await Promise.all([
    downloadS3Content(email.htmlContentS3Key),
    downloadS3Content(email.textContentS3Key),
  ]);

  if (!html && !text) {
    throw new NotFoundError(
      "Email content not available",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  return responseOk(
    {
      html,
      text,
    },
    "email_content"
  );
}
