/**
 * Marketing Email Handlers (External API)
 *
 * Business logic for marketing email CRUD operations.
 * Marketing emails are reusable HTML templates used in
 * double opt-in flows and automations.
 */

import type { EmailType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/lib/api/errors";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { htmlToPlainText } from "@/lib/email/html-to-text";
import { validateEmailCompliance } from "@/lib/emails/compliance-validation";
import { validateEmailHtml } from "@/lib/emails/html-validation";
import { SAMPLE_VARIABLES, extractVariables } from "@/lib/emails/variables";
import {
  createMarketingEmailSchema,
  updateMarketingEmailSchema,
} from "./schema";

/**
 * POST /api/v1/marketing-emails
 *
 * Create a new marketing email.
 */
export async function createMarketingEmail(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(createMarketingEmailSchema, request);

  let htmlContent: string | null = null;
  let textContent: string | null = null;

  if (data.html) {
    const validation = validateEmailHtml(data.html);
    if (!validation.valid) {
      throw new BadRequestError(
        validation.errors.map((e) => e.message).join("; "),
        ErrorCode.VALIDATION_FAILED,
      );
    }
    const compliance = validateEmailCompliance(data.html);
    if (!compliance.valid) {
      throw new BadRequestError(
        `Email is missing required compliance variables: ${compliance.missing.join(", ")}`,
        ErrorCode.VALIDATION_FAILED,
      );
    }
    htmlContent = data.html;
    textContent = htmlToPlainText(data.html);
  }

  const email = await prisma.email.create({
    data: {
      workspaceId,
      name: data.name,
      subject: data.subject,
      previewText: data.previewText,
      htmlContent,
      textContent,
      senderIdentityId: data.senderIdentityId,
      replyToIdentityId: data.replyToIdentityId,
      trackClicks: data.trackClicks,
      trackOpens: data.trackOpens,
      type: data.type as EmailType,
    },
  });

  return responseCreated({ id: email.id }, "marketing_email");
}

/**
 * GET /api/v1/marketing-emails
 *
 * List marketing emails (excludes transactional).
 */
export async function listMarketingEmails(
  workspaceId: string,
  request: NextRequest,
) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const where = {
    workspaceId,
    type: { in: ["AUTOMATION" as const, "NOTIFICATION" as const] },
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
    createCursorPaginatedResponse(
      formattedEmails,
      hasMore,
      "marketing_email_list",
    ),
  );
}

/**
 * GET /api/v1/marketing-emails/[emailId]
 *
 * Get a specific marketing email by ID.
 */
export async function getMarketingEmail(
  workspaceId: string,
  emailId: string,
) {
  const email = await prisma.email.findFirst({
    where: { id: emailId, workspaceId },
  });

  if (!email) {
    throw new NotFoundError(
      "Marketing email not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  const variables = email.htmlContent
    ? extractVariables(email.htmlContent)
    : [];

  return responseOk(
    {
      id: email.id,
      name: email.name,
      subject: email.subject,
      previewText: email.previewText,
      html: email.htmlContent,
      variables,
      senderIdentityId: email.senderIdentityId,
      replyToIdentityId: email.replyToIdentityId,
      trackClicks: email.trackClicks,
      trackOpens: email.trackOpens,
      type: email.type,
      createdAt: email.createdAt.toISOString(),
      updatedAt: email.updatedAt.toISOString(),
    },
    "marketing_email",
  );
}

/**
 * PUT /api/v1/marketing-emails/[emailId]
 *
 * Update a specific marketing email by ID.
 */
export async function updateMarketingEmail(
  workspaceId: string,
  emailId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateMarketingEmailSchema, request);

  const existingEmail = await prisma.email.findFirst({
    where: { id: emailId, workspaceId },
  });

  if (!existingEmail) {
    throw new NotFoundError(
      "Marketing email not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  let htmlContent: string | null | undefined = undefined;
  let textContent: string | null | undefined = undefined;

  if (data.html !== undefined) {
    if (data.html === null) {
      htmlContent = null;
      textContent = null;
    } else {
      const validation = validateEmailHtml(data.html);
      if (!validation.valid) {
        throw new BadRequestError(
          validation.errors.map((e) => e.message).join("; "),
          ErrorCode.VALIDATION_FAILED,
        );
      }
      htmlContent = data.html;
      textContent = htmlToPlainText(data.html);
    }
  }

  if (typeof data.html === "string") {
    const compliance = validateEmailCompliance(data.html);
    if (!compliance.valid) {
      throw new BadRequestError(
        `Email is missing required compliance variables: ${compliance.missing.join(", ")}`,
        ErrorCode.VALIDATION_FAILED,
      );
    }
  }

  const updatedEmail = await prisma.email.update({
    where: { id: emailId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.previewText !== undefined && { previewText: data.previewText }),
      ...(htmlContent !== undefined && { htmlContent }),
      ...(textContent !== undefined && { textContent }),
      ...(data.senderIdentityId !== undefined && {
        senderIdentityId: data.senderIdentityId,
      }),
      ...(data.replyToIdentityId !== undefined && {
        replyToIdentityId: data.replyToIdentityId,
      }),
      ...(data.trackClicks !== undefined && { trackClicks: data.trackClicks }),
      ...(data.trackOpens !== undefined && { trackOpens: data.trackOpens }),
      ...(data.type !== undefined && { type: data.type as EmailType }),
    },
  });

  return responseOk({ id: updatedEmail.id }, "marketing_email");
}

/**
 * DELETE /api/v1/marketing-emails/[emailId]
 *
 * Delete a specific marketing email by ID.
 * Fails if the email is used by any form.
 */
export async function deleteMarketingEmail(
  workspaceId: string,
  emailId: string,
) {
  const email = await prisma.email.findFirst({
    where: { id: emailId, workspaceId },
    include: {
      formsAsDoubleOptIn: {
        select: { id: true, name: true },
        take: 1,
      },
    },
  });

  if (!email) {
    throw new NotFoundError(
      "Marketing email not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  if (email.formsAsDoubleOptIn.length > 0) {
    throw new ConflictError(
      `Cannot delete email. It is used by form: ${email.formsAsDoubleOptIn[0].name}`,
      ErrorCode.RESOURCE_CONFLICT,
    );
  }

  await prisma.email.delete({ where: { id: emailId } });

  return responseOk({ id: emailId }, "marketing_email");
}

/**
 * GET /api/v1/marketing-emails/[emailId]/preview
 *
 * Get HTML preview with sample variables substituted.
 */
export async function previewMarketingEmail(
  workspaceId: string,
  emailId: string,
) {
  const email = await prisma.email.findFirst({
    where: { id: emailId, workspaceId },
  });

  if (!email) {
    throw new NotFoundError(
      "Marketing email not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  if (!email.htmlContent) {
    return responseOk({ html: null, hasContent: false });
  }

  // Substitute sample values for preview
  const html = email.htmlContent.replace(
    /\{\{(\w+(?:\.\w+)*)\}\}/g,
    (match, varName) => SAMPLE_VARIABLES[varName] ?? match,
  );

  return responseOk({ html, hasContent: true });
}

/**
 * GET /api/v1/marketing-emails/[emailId]/stats
 *
 * Get analytics for a marketing email, cached in Redis.
 */
export async function getMarketingEmailStats(
  workspaceId: string,
  emailId: string,
) {
  const email = await prisma.email.findFirst({
    where: { id: emailId, workspaceId },
  });

  if (!email) {
    throw new NotFoundError(
      "Marketing email not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  // Find all forms that use this email
  const forms = await prisma.form.findMany({
    where: { doubleOptInEmailId: emailId, workspaceId },
    select: { id: true, name: true },
  });

  const broadcastIds = forms.map((f) => `doi-${f.id}`);

  const stats = {
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalComplained: 0,
    openRate: 0,
    clickRate: 0,
    usedByForms: forms.map((f) => ({ id: f.id, name: f.name })),
  };

  if (broadcastIds.length > 0) {
    const counts = await prisma.event.groupBy({
      by: ["type"],
      where: { broadcastId: { in: broadcastIds }, workspaceId },
      _count: true,
    });

    const countMap: Record<string, number> = {};
    for (const row of counts) {
      countMap[row.type] = row._count;
    }

    stats.totalSent = countMap["Queued"] ?? 0;
    stats.totalDelivered = countMap["Delivery"] ?? 0;
    stats.totalOpened = countMap["Open"] ?? 0;
    stats.totalClicked = countMap["Click"] ?? 0;
    stats.totalBounced = countMap["Bounce"] ?? 0;
    stats.totalComplained = countMap["SpamComplaint"] ?? 0;
    stats.openRate =
      stats.totalDelivered > 0
        ? Number((stats.totalOpened / stats.totalDelivered).toFixed(3))
        : 0;
    stats.clickRate =
      stats.totalDelivered > 0
        ? Number((stats.totalClicked / stats.totalDelivered).toFixed(3))
        : 0;
  }

  return responseOk(stats, "marketing_email_stats");
}
