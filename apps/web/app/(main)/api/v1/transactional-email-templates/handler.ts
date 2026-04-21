/**
 * Transactional Email Templates Handler (External API)
 *
 * Business logic for the HTML-only transactional template REST surface.
 *
 * Unlike the internal dashboard handler (which stores visual-editor JSON
 * and renders HTML at publish time), this external handler persists raw
 * HTML directly on `EmailContent.contentHtml` and relies on the unified
 * publish path in `../../internal/v1/email-templates/handler` to
 * materialize text + mark the row PUBLISHED.
 *
 * Auth: API key.
 * Scopes: `read:templates` / `manage:templates`.
 */

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
  publishEmailTemplate as publishEmailTemplateInternal,
  createEmailTemplateVersion as createEmailTemplateVersionInternal,
  listEmailTemplateVersions as listEmailTemplateVersionsInternal,
} from "../../internal/v1/email-templates/handler";
import {
  createTransactionalEmailTemplateSchema,
  updateTransactionalEmailTemplateSchema,
} from "./schema";

/**
 * Validates that optional sender identity IDs belong to the workspace.
 */
async function validateSenderIdentities(
  workspaceId: string,
  senderIdentityId?: string | null,
  replyToIdentityId?: string | null,
): Promise<void> {
  const identityIds = [senderIdentityId, replyToIdentityId].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (identityIds.length === 0) return;

  const identities = await prisma.senderIdentity.findMany({
    where: { id: { in: identityIds }, workspaceId },
    select: { id: true },
  });
  const foundIds = new Set(identities.map((i) => i.id));

  if (senderIdentityId && !foundIds.has(senderIdentityId)) {
    throw new NotFoundError(
      "Sender identity not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }
  if (replyToIdentityId && !foundIds.has(replyToIdentityId)) {
    throw new NotFoundError(
      "Reply-to identity not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }
}

/**
 * Runs the two mandatory HTML gates for transactional templates.
 */
function validateTransactionalHtml(html: string): void {
  const structural = validateEmailHtml(html);
  if (!structural.valid) {
    throw new BadRequestError(
      structural.errors.map((e) => e.message).join("; "),
      ErrorCode.VALIDATION_FAILED,
    );
  }
  const compliance = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
  if (!compliance.valid) {
    throw new BadRequestError(
      `Transactional template is missing required compliance variables: ${compliance.missing.join(", ")}`,
      ErrorCode.VALIDATION_FAILED,
    );
  }
}

interface TemplateWithContent {
  id: string;
  name: string;
  description: string | null;
  uniqueSlug: string | null;
  status: string;
  version: number;
  parentId: string | null;
  senderIdentityId: string | null;
  replyToIdentityId: string | null;
  trackClicks: boolean;
  trackOpens: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  emailContent: {
    subject: string | null;
    previewText: string | null;
    contentHtml: string | null;
    contentText: string | null;
    variables: unknown;
  } | null;
}

function formatTransactionalTemplate(template: TemplateWithContent) {
  const html = template.emailContent?.contentHtml ?? null;
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    uniqueSlug: template.uniqueSlug,
    status: template.status,
    version: template.version,
    parentId: template.parentId,
    subject: template.emailContent?.subject ?? null,
    previewText: template.emailContent?.previewText ?? null,
    html,
    text: template.emailContent?.contentText ?? null,
    variables: html ? extractVariables(html) : [],
    variableDefinitions: template.emailContent?.variables ?? [],
    senderIdentityId: template.senderIdentityId,
    replyToIdentityId: template.replyToIdentityId,
    trackClicks: template.trackClicks,
    trackOpens: template.trackOpens,
    publishedAt: template.publishedAt?.toISOString() ?? null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

/**
 * POST /api/v1/transactional-email-templates
 *
 * Create a transactional email template. By default the template is
 * created and published atomically; pass `publish: false` to keep it
 * as a DRAFT.
 */
export async function createTransactionalEmailTemplate(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(
    createTransactionalEmailTemplateSchema,
    request,
  );

  validateTransactionalHtml(data.html);
  await validateSenderIdentities(
    workspaceId,
    data.senderIdentityId,
    data.replyToIdentityId,
  );

  const contentHtml = data.html;
  const contentText = htmlToPlainText(data.html);
  const now = new Date();

  try {
    const template = await prisma.$transaction(async (tx) => {
      const emailContent = await tx.emailContent.create({
        data: {
          subject: data.subject,
          previewText: data.previewText,
          contentHtml,
          contentText,
          variables: data.variables ?? undefined,
        },
      });

      return tx.emailTemplate.create({
        data: {
          workspaceId,
          name: data.name,
          description: data.description,
          uniqueSlug: data.uniqueSlug,
          emailContentId: emailContent.id,
          senderIdentityId: data.senderIdentityId,
          replyToIdentityId: data.replyToIdentityId,
          trackClicks: data.trackClicks,
          trackOpens: data.trackOpens,
          status: data.publish ? "PUBLISHED" : "DRAFT",
          version: 1,
          publishedAt: data.publish ? now : null,
          // self-reference published version on first publish
          ...(data.publish ? {} : {}),
        },
      });
    });

    // For a published template the `publishedVersionId` must point at
    // itself. Prisma cannot self-reference in the same create, so we do
    // it in a follow-up update.
    if (data.publish) {
      await prisma.emailTemplate.update({
        where: { id: template.id },
        data: { publishedVersionId: template.id },
      });
    }

    return responseCreated(
      {
        id: template.id,
        uniqueSlug: template.uniqueSlug,
        status: data.publish ? "PUBLISHED" : "DRAFT",
      },
      "transactional_email_template",
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new ConflictError(
        "A template with this unique slug already exists in the workspace",
        ErrorCode.RESOURCE_ALREADY_EXISTS,
      );
    }
    throw error;
  }
}

/**
 * GET /api/v1/transactional-email-templates
 *
 * List root transactional templates (parentId = null) with cursor
 * pagination. Versions are fetched via the `/versions` sub-endpoint.
 */
export async function listTransactionalEmailTemplates(
  workspaceId: string,
  request: NextRequest,
) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: {
      workspaceId,
      parentId: null,
    },
    include: { emailContent: true },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const templates = after
    ? await prisma.emailTemplate.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.emailTemplate.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.emailTemplate.findMany(baseQuery);

  const hasMore = templates.length > limit;
  const items = hasMore ? templates.slice(0, -1) : templates;
  if (before) items.reverse();

  return responseOk(
    createCursorPaginatedResponse(
      items.map(formatTransactionalTemplate),
      hasMore,
      "transactional_email_template_list",
    ),
  );
}

async function findTemplateOrThrow(workspaceId: string, templateId: string) {
  const template = await prisma.emailTemplate.findFirst({
    where: { id: templateId, workspaceId },
    include: { emailContent: true },
  });
  if (!template) {
    throw new NotFoundError(
      "Transactional email template not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }
  return template;
}

/**
 * GET /api/v1/transactional-email-templates/[templateId]
 */
export async function getTransactionalEmailTemplate(
  workspaceId: string,
  templateId: string,
) {
  const template = await findTemplateOrThrow(workspaceId, templateId);
  return responseOk(
    formatTransactionalTemplate(template),
    "transactional_email_template",
  );
}

/**
 * PUT /api/v1/transactional-email-templates/[templateId]
 *
 * Update a DRAFT transactional template. Published templates are
 * immutable — create a new version via POST /versions first.
 */
export async function updateTransactionalEmailTemplate(
  workspaceId: string,
  templateId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(
    updateTransactionalEmailTemplateSchema,
    request,
  );

  const existing = await findTemplateOrThrow(workspaceId, templateId);

  if (existing.status !== "DRAFT") {
    throw new BadRequestError(
      "Only templates in DRAFT status can be edited. Create a new version to modify a published template.",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  if (data.uniqueSlug !== undefined && existing.parentId !== null) {
    throw new BadRequestError(
      "Unique slug can only be set on the parent template, not on versions.",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  if (typeof data.html === "string") {
    validateTransactionalHtml(data.html);
  }

  await validateSenderIdentities(
    workspaceId,
    data.senderIdentityId === undefined ? undefined : data.senderIdentityId,
    data.replyToIdentityId === undefined ? undefined : data.replyToIdentityId,
  );

  try {
    await prisma.$transaction(async (tx) => {
      if (existing.emailContentId) {
        const contentUpdate: Record<string, unknown> = {};
        if (data.subject !== undefined) contentUpdate.subject = data.subject;
        if (data.previewText !== undefined)
          contentUpdate.previewText = data.previewText;
        if (typeof data.html === "string") {
          contentUpdate.contentHtml = data.html;
          contentUpdate.contentText = htmlToPlainText(data.html);
        }
        if (data.variables !== undefined)
          contentUpdate.variables = data.variables;

        if (Object.keys(contentUpdate).length > 0) {
          await tx.emailContent.update({
            where: { id: existing.emailContentId },
            data: contentUpdate,
          });
        }
      }

      await tx.emailTemplate.update({
        where: { id: templateId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.uniqueSlug !== undefined && {
            uniqueSlug: data.uniqueSlug,
          }),
          ...(data.senderIdentityId !== undefined && {
            senderIdentityId: data.senderIdentityId,
          }),
          ...(data.replyToIdentityId !== undefined && {
            replyToIdentityId: data.replyToIdentityId,
          }),
          ...(data.trackClicks !== undefined && {
            trackClicks: data.trackClicks,
          }),
          ...(data.trackOpens !== undefined && {
            trackOpens: data.trackOpens,
          }),
        },
      });
    });

    return responseOk({ id: templateId }, "transactional_email_template");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new ConflictError(
        "A template with this unique slug already exists in the workspace",
        ErrorCode.RESOURCE_ALREADY_EXISTS,
      );
    }
    throw error;
  }
}

/**
 * DELETE /api/v1/transactional-email-templates/[templateId]
 */
export async function deleteTransactionalEmailTemplate(
  workspaceId: string,
  templateId: string,
) {
  const template = await findTemplateOrThrow(workspaceId, templateId);

  if (template.status !== "DRAFT") {
    throw new BadRequestError(
      "Only templates in DRAFT status can be deleted.",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  await prisma.emailTemplate.delete({ where: { id: templateId } });
  if (template.emailContentId) {
    await prisma.emailContent.delete({
      where: { id: template.emailContentId },
    });
  }
  return responseOk({ id: templateId }, "transactional_email_template");
}

/**
 * POST /api/v1/transactional-email-templates/[templateId]/publish
 *
 * Delegates to the shared publish pipeline. Re-runs transactional
 * compliance on the persisted HTML to catch anyone who mutated the
 * row out of band.
 */
export async function publishTransactionalEmailTemplate(
  workspaceId: string,
  templateId: string,
) {
  const template = await findTemplateOrThrow(workspaceId, templateId);
  if (template.emailContent?.contentHtml) {
    validateTransactionalHtml(template.emailContent.contentHtml);
  }
  return publishEmailTemplateInternal(workspaceId, templateId);
}

/**
 * GET /api/v1/transactional-email-templates/[templateId]/preview
 *
 * Returns the HTML with SAMPLE_VARIABLES substituted so consumers can
 * preview the template without a full send.
 */
export async function previewTransactionalEmailTemplate(
  workspaceId: string,
  templateId: string,
) {
  const template = await findTemplateOrThrow(workspaceId, templateId);
  const html = template.emailContent?.contentHtml ?? null;

  if (!html) {
    return responseOk(
      { html: null, hasContent: false },
      "transactional_email_template_preview",
    );
  }

  const preview = html.replace(
    /\{\{(\w+(?:\.\w+)*)\}\}/g,
    (match, varName) => SAMPLE_VARIABLES[varName] ?? match,
  );

  return responseOk(
    { html: preview, hasContent: true },
    "transactional_email_template_preview",
  );
}

/**
 * POST /api/v1/transactional-email-templates/[templateId]/versions
 */
export async function createTransactionalEmailTemplateVersion(
  workspaceId: string,
  templateId: string,
) {
  return createEmailTemplateVersionInternal(workspaceId, templateId);
}

/**
 * GET /api/v1/transactional-email-templates/[templateId]/versions
 */
export async function listTransactionalEmailTemplateVersions(
  workspaceId: string,
  templateId: string,
) {
  return listEmailTemplateVersionsInternal(workspaceId, templateId);
}
