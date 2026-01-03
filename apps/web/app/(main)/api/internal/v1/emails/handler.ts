/**
 * Email Handlers (Internal API)
 *
 * Business logic for email CRUD operations.
 * Emails are reusable templates for transactional emails,
 * used in forms (double opt-in), automations, and notifications.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequestBody } from "@/lib/api/validation";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { createEmailSchema, updateEmailSchema } from "./schema";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import type { EmailType } from "@prisma/client";

/**
 * POST /api/internal/v1/emails
 *
 * Create a new email for the workspace.
 */
export async function createEmail(workspaceId: string, request: NextRequest) {
  const data = await validateRequestBody(createEmailSchema, request);

  const email = await prisma.email.create({
    data: {
      workspaceId,
      name: data.name,
      subject: data.subject,
      previewText: data.previewText,
      content: data.content ?? null,
      styles: data.styles ?? null,
      senderIdentityId: data.senderIdentityId,
      replyToIdentityId: data.replyToIdentityId,
      trackClicks: data.trackClicks,
      trackOpens: data.trackOpens,
      type: data.type as EmailType,
    },
  });

  return responseCreated(
    {
      id: email.id,
    },
    "email"
  );
}

/**
 * GET /api/internal/v1/emails
 *
 * List emails for the workspace with cursor-based pagination.
 * Supports filtering by type.
 */
export async function listEmails(workspaceId: string, request: NextRequest) {
  const { limit, after, before } = parseCursorPaginationParams(request);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as EmailType | null;

  const where = {
    workspaceId,
    ...(type && { type }),
  };

  const baseQuery = {
    where,
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const emails = after
    ? await prisma.email.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.email.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.email.findMany(baseQuery);

  const hasMore = emails.length > limit;
  const items = hasMore ? emails.slice(0, -1) : emails;

  if (before) {
    items.reverse();
  }

  const formattedEmails = items.map((email) => ({
    id: email.id,
    name: email.name,
    subject: email.subject,
    previewText: email.previewText,
    type: email.type,
    trackClicks: email.trackClicks,
    trackOpens: email.trackOpens,
    createdAt: email.createdAt.toISOString(),
    updatedAt: email.updatedAt.toISOString(),
  }));

  return responseOk(
    createCursorPaginatedResponse(formattedEmails, hasMore, "email_list")
  );
}

/**
 * GET /api/internal/v1/emails/[emailId]
 *
 * Get a specific email by ID with full content.
 */
export async function getEmail(workspaceId: string, emailId: string) {
  const email = await prisma.email.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
  });

  if (!email) {
    throw new NotFoundError("Email not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  return responseOk(
    {
      id: email.id,
      name: email.name,
      subject: email.subject,
      previewText: email.previewText,
      content: email.content,
      styles: email.styles,
      senderIdentityId: email.senderIdentityId,
      replyToIdentityId: email.replyToIdentityId,
      trackClicks: email.trackClicks,
      trackOpens: email.trackOpens,
      type: email.type,
      createdAt: email.createdAt.toISOString(),
      updatedAt: email.updatedAt.toISOString(),
    },
    "email"
  );
}

/**
 * PUT /api/internal/v1/emails/[emailId]
 *
 * Update a specific email by ID.
 */
export async function updateEmail(
  workspaceId: string,
  emailId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateEmailSchema, request);

  const existingEmail = await prisma.email.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
  });

  if (!existingEmail) {
    throw new NotFoundError("Email not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  const updatedEmail = await prisma.email.update({
    where: {
      id: emailId,
    },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.previewText !== undefined && { previewText: data.previewText }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.styles !== undefined && { styles: data.styles }),
      ...(data.senderIdentityId !== undefined && { senderIdentityId: data.senderIdentityId }),
      ...(data.replyToIdentityId !== undefined && { replyToIdentityId: data.replyToIdentityId }),
      ...(data.trackClicks !== undefined && { trackClicks: data.trackClicks }),
      ...(data.trackOpens !== undefined && { trackOpens: data.trackOpens }),
      ...(data.type !== undefined && { type: data.type as EmailType }),
    },
  });

  return responseOk(
    {
      id: updatedEmail.id,
    },
    "email"
  );
}

/**
 * DELETE /api/internal/v1/emails/[emailId]
 *
 * Delete a specific email by ID.
 * Note: This will fail if the email is referenced by forms or automations.
 */
export async function deleteEmail(workspaceId: string, emailId: string) {
  const email = await prisma.email.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
    include: {
      formsAsDoubleOptIn: {
        select: { id: true, name: true },
        take: 1,
      },
    },
  });

  if (!email) {
    throw new NotFoundError("Email not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  // Check if email is in use
  if (email.formsAsDoubleOptIn.length > 0) {
    throw new NotFoundError(
      `Cannot delete email. It is used by form: ${email.formsAsDoubleOptIn[0].name}`,
      ErrorCode.RESOURCE_CONFLICT
    );
  }

  await prisma.email.delete({
    where: {
      id: emailId,
    },
  });

  return responseOk(
    {
      id: emailId,
    },
    "email"
  );
}
