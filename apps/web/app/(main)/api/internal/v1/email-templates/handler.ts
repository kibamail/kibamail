/**
 * Email Templates Handler (Internal API)
 *
 * Business logic for email template CRUD operations.
 * Email templates are reusable transactional email templates with versioning support.
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
import { createEmailTemplateSchema, updateEmailTemplateSchema } from "./schema";

/**
 * Validates that sender identity IDs belong to the specified workspace.
 * Throws NotFoundError if any identity doesn't exist or belongs to a different workspace.
 */
async function validateSenderIdentities(
  workspaceId: string,
  senderIdentityId?: string | null,
  replyToIdentityId?: string | null,
): Promise<void> {
  const identityIds = [senderIdentityId, replyToIdentityId].filter(
    (id): id is string => id !== null && id !== undefined,
  );

  if (identityIds.length === 0) return;

  const identities = await prisma.senderIdentity.findMany({
    where: {
      id: { in: identityIds },
      workspaceId,
    },
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
 * POST /api/internal/v1/email-templates
 *
 * Create a new email template for the workspace.
 * Creates the template in DRAFT status with version 1.
 * Automatically creates an associated EmailContent record.
 * Only requires a name - sender identities can be set via update.
 */
export async function createEmailTemplate(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(createEmailTemplateSchema, request);

  // Create the template with its own EmailContent in a transaction
  const template = await prisma.$transaction(async (tx) => {
    // Create the email content for this template
    const emailContent = await tx.emailContent.create({
      data: {},
    });

    // Create the template linked to the content
    return tx.emailTemplate.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description,
        emailContentId: emailContent.id,
        trackClicks: data.trackClicks,
        trackOpens: data.trackOpens,
        status: "DRAFT",
        version: 1,
      },
    });
  });

  return responseCreated(
    {
      id: template.id,
    },
    "email_template",
  );
}

/**
 * GET /api/internal/v1/email-templates
 *
 * List email templates for the workspace with cursor-based pagination.
 * Returns root templates only (parentId is null).
 */
export async function listEmailTemplates(
  workspaceId: string,
  request: NextRequest,
) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: {
      workspaceId,
      parentId: null,
    },
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

  if (before) {
    items.reverse();
  }

  const formattedTemplates = items.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    status: template.status,
    version: template.version,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }));

  return responseOk(
    createCursorPaginatedResponse(
      formattedTemplates,
      hasMore,
      "email_template_list",
    ),
  );
}

/**
 * GET /api/internal/v1/email-templates/[templateId]
 *
 * Get a specific email template by ID with full content.
 */
export async function getEmailTemplate(
  workspaceId: string,
  templateId: string,
) {
  const template = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId,
    },
    include: {
      emailContent: true,
      senderIdentity: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      replyToIdentity: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!template) {
    throw new NotFoundError(
      "Email template not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  return responseOk(
    {
      id: template.id,
      name: template.name,
      description: template.description,
      status: template.status,
      version: template.version,
      emailContentId: template.emailContentId,
      emailContent: template.emailContent
        ? {
            subject: template.emailContent.subject,
            previewText: template.emailContent.previewText,
            contentJson: template.emailContent.contentJson,
            styles: template.emailContent.styles,
            contentHtml: template.emailContent.contentHtml,
            contentText: template.emailContent.contentText,
            variables: template.emailContent.variables,
          }
        : null,
      senderIdentityId: template.senderIdentityId,
      senderIdentity: template.senderIdentity
        ? {
            id: template.senderIdentity.id,
            name: template.senderIdentity.name,
            email: template.senderIdentity.email,
          }
        : null,
      replyToIdentityId: template.replyToIdentityId,
      replyToIdentity: template.replyToIdentity
        ? {
            id: template.replyToIdentity.id,
            name: template.replyToIdentity.name,
            email: template.replyToIdentity.email,
          }
        : null,
      trackClicks: template.trackClicks,
      trackOpens: template.trackOpens,
      publishedAt: template.publishedAt?.toISOString() || null,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    },
    "email_template",
  );
}

/**
 * PUT /api/internal/v1/email-templates/[templateId]
 *
 * Update a specific email template by ID.
 * Only DRAFT templates can be edited.
 */
export async function updateEmailTemplate(
  workspaceId: string,
  templateId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateEmailTemplateSchema, request);

  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId,
    },
  });

  if (!existingTemplate) {
    throw new NotFoundError(
      "Email template not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  if (existingTemplate.status !== "DRAFT") {
    throw new BadRequestError(
      "Only templates in DRAFT status can be edited. Published or archived templates cannot be modified.",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  // Validate sender identities exist and belong to this workspace
  // Only validate if the value is being set (not null or undefined)
  await validateSenderIdentities(
    workspaceId,
    data.senderIdentityId === undefined ? undefined : data.senderIdentityId,
    data.replyToIdentityId === undefined ? undefined : data.replyToIdentityId,
  );

  // Update template and email content in a transaction
  const updatedTemplate = await prisma.$transaction(async (tx) => {
    // Update the email content if provided
    if (data.emailContent && existingTemplate.emailContentId) {
      await tx.emailContent.update({
        where: { id: existingTemplate.emailContentId },
        data: {
          ...(data.emailContent.subject !== undefined && {
            subject: data.emailContent.subject,
          }),
          ...(data.emailContent.previewText !== undefined && {
            previewText: data.emailContent.previewText,
          }),
          ...(data.emailContent.contentJson !== undefined && {
            contentJson:
              data.emailContent.contentJson as Record<string, unknown>,
          }),
          ...(data.emailContent.styles !== undefined && {
            styles: data.emailContent.styles as Record<string, unknown>,
          }),
          ...(data.emailContent.variables !== undefined && {
            variables: data.emailContent.variables,
          }),
        },
      });
    }

    // Update the template
    return tx.emailTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.senderIdentityId !== undefined && {
          senderIdentityId: data.senderIdentityId,
        }),
        ...(data.replyToIdentityId !== undefined && {
          replyToIdentityId: data.replyToIdentityId,
        }),
        ...(data.trackClicks !== undefined && { trackClicks: data.trackClicks }),
        ...(data.trackOpens !== undefined && { trackOpens: data.trackOpens }),
      },
    });
  });

  return responseOk(
    {
      id: updatedTemplate.id,
    },
    "email_template",
  );
}

/**
 * DELETE /api/internal/v1/email-templates/[templateId]
 *
 * Delete a specific email template by ID.
 * Only DRAFT templates can be deleted.
 */
export async function deleteEmailTemplate(
  workspaceId: string,
  templateId: string,
) {
  const template = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId,
    },
  });

  if (!template) {
    throw new NotFoundError(
      "Email template not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  if (template.status !== "DRAFT") {
    throw new BadRequestError(
      "Only templates in DRAFT status can be deleted. Published or archived templates cannot be deleted.",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  await prisma.emailTemplate.delete({
    where: {
      id: templateId,
    },
  });

  // Delete the associated emailContent (each template has its own content)
  if (template.emailContentId) {
    await prisma.emailContent.delete({
      where: { id: template.emailContentId },
    });
  }

  return responseOk(
    {
      id: templateId,
    },
    "email_template",
  );
}

/**
 * POST /api/internal/v1/email-templates/[templateId]/versions
 *
 * Create a new version of an email template.
 * New version is created with status DRAFT and incremented version number.
 * Copies email content from the source template.
 */
export async function createEmailTemplateVersion(
  workspaceId: string,
  templateId: string,
) {
  // Find the source template
  const sourceTemplate = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId,
    },
    include: {
      emailContent: true,
    },
  });

  if (!sourceTemplate) {
    throw new NotFoundError(
      "Email template not found",
      ErrorCode.TEMPLATE_NOT_FOUND,
    );
  }

  // Determine the root parent ID
  // If the source template is itself a version (has a parentId), use that
  // Otherwise, the source template is the root, so use its ID
  const rootParentId = sourceTemplate.parentId || sourceTemplate.id;

  // Check if a DRAFT version already exists for this parent
  // Due to unique constraint: @@unique([workspaceId, parentId, status])
  // Only one DRAFT version can exist per parent
  const existingDraft = await prisma.emailTemplate.findFirst({
    where: {
      parentId: rootParentId,
      status: "DRAFT",
      workspaceId,
    },
  });

  if (existingDraft) {
    throw new ConflictError(
      "A DRAFT version already exists for this template. Please publish or delete it before creating a new version.",
      ErrorCode.TEMPLATE_HAS_DRAFT_VERSION,
    );
  }

  // Get all versions to calculate next version number
  const allVersions = await prisma.emailTemplate.findMany({
    where: {
      OR: [{ id: rootParentId }, { parentId: rootParentId }],
      workspaceId,
    },
    select: {
      version: true,
    },
  });

  const maxVersion = Math.max(...allVersions.map((v) => v.version));
  const nextVersion = maxVersion + 1;

  // Create new version with copied content in a transaction
  const newVersion = await prisma.$transaction(async (tx) => {
    // Create a new EmailContent by copying from source
    const newEmailContent = await tx.emailContent.create({
      data: {
        subject: sourceTemplate.emailContent?.subject,
        previewText: sourceTemplate.emailContent?.previewText,
        contentJson: sourceTemplate.emailContent?.contentJson ?? undefined,
        styles: sourceTemplate.emailContent?.styles ?? undefined,
        contentHtml: sourceTemplate.emailContent?.contentHtml,
        contentText: sourceTemplate.emailContent?.contentText,
        variables: sourceTemplate.emailContent?.variables ?? undefined,
      },
    });

    // Create the new template version
    return tx.emailTemplate.create({
      data: {
        workspaceId,
        parentId: rootParentId,
        version: nextVersion,
        name: sourceTemplate.name,
        description: sourceTemplate.description,
        emailContentId: newEmailContent.id,
        senderIdentityId: sourceTemplate.senderIdentityId,
        replyToIdentityId: sourceTemplate.replyToIdentityId,
        trackClicks: sourceTemplate.trackClicks,
        trackOpens: sourceTemplate.trackOpens,
        status: "DRAFT",
      },
    });
  });

  return responseCreated(
    {
      id: newVersion.id,
    },
    "email_template",
  );
}

/**
 * POST /api/internal/v1/email-templates/[templateId]/publish
 *
 * Publish an email template.
 * - For root templates (parentId=null): Sets status to PUBLISHED and publishedVersionId to self
 * - For versions (parentId!=null): Archives old published version, publishes new version, updates root's publishedVersionId
 */
export async function publishEmailTemplate(
  workspaceId: string,
  templateId: string,
) {
  // Find the template to publish
  const template = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId,
    },
    include: {
      emailContent: true,
    },
  });

  if (!template) {
    throw new NotFoundError(
      "Email template not found",
      ErrorCode.TEMPLATE_NOT_FOUND,
    );
  }

  // Check if already published
  if (template.status === "PUBLISHED") {
    throw new BadRequestError(
      "Template is already published",
      ErrorCode.TEMPLATE_ALREADY_PUBLISHED,
    );
  }

  // Validate template has content with at least a subject
  if (!template.emailContent?.subject) {
    throw new BadRequestError(
      "Cannot publish a template without a subject. Add a subject before publishing.",
      ErrorCode.TEMPLATE_NO_CONTENT,
    );
  }

  // Root template (first publish)
  if (!template.parentId) {
    const updatedTemplate = await prisma.emailTemplate.update({
      where: {
        id: templateId,
        workspaceId,
      },
      data: {
        status: "PUBLISHED",
        publishedVersionId: templateId, // Self-reference
        publishedAt: new Date(),
      },
    });

    return responseOk(
      {
        id: updatedTemplate.id,
      },
      "email_template",
    );
  }

  // Version template - need to handle publishing logic
  const rootParentId = template.parentId;

  // Get the root template
  const rootTemplate = await prisma.emailTemplate.findUnique({
    where: { id: rootParentId },
  });

  if (!rootTemplate) {
    throw new NotFoundError(
      "Parent template not found",
      ErrorCode.TEMPLATE_NOT_FOUND,
    );
  }

  // Find currently published version for this parent
  const currentlyPublished = await prisma.emailTemplate.findFirst({
    where: {
      parentId: rootParentId,
      status: "PUBLISHED",
      workspaceId,
    },
  });

  // Use a transaction to ensure atomic updates
  await prisma.$transaction(async (tx) => {
    // Archive the currently published version if exists (child version)
    if (currentlyPublished) {
      await tx.emailTemplate.update({
        where: {
          id: currentlyPublished.id,
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    // Archive the root template if it's currently published
    // The root template is also version 1, so when we publish version 2+, version 1 should be archived
    if (rootTemplate.status === "PUBLISHED") {
      await tx.emailTemplate.update({
        where: {
          id: rootParentId,
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    // Publish the new version
    await tx.emailTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    // Update root template's publishedVersionId
    await tx.emailTemplate.update({
      where: {
        id: rootParentId,
      },
      data: {
        publishedVersionId: templateId,
      },
    });
  });

  return responseOk(
    {
      id: templateId,
    },
    "email_template",
  );
}

/**
 * GET /api/internal/v1/email-templates/[templateId]/versions
 *
 * List all versions of an email template.
 * Returns all versions including root and child versions.
 */
export async function listEmailTemplateVersions(
  workspaceId: string,
  templateId: string,
) {
  // First, find the template to determine if it's root or a version
  const template = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId,
    },
  });

  if (!template) {
    throw new NotFoundError(
      "Email template not found",
      ErrorCode.TEMPLATE_NOT_FOUND,
    );
  }

  // Determine the root ID
  const rootId = template.parentId || template.id;

  // Get root template to check publishedVersionId
  const rootTemplate = template.parentId
    ? await prisma.emailTemplate.findUnique({ where: { id: rootId } })
    : template;

  // Get all versions
  const allVersions = await prisma.emailTemplate.findMany({
    where: {
      OR: [{ id: rootId }, { parentId: rootId }],
      workspaceId,
    },
    orderBy: {
      version: "asc",
    },
  });

  const formattedVersions = allVersions.map((version) => ({
    id: version.id,
    name: version.name,
    version: version.version,
    status: version.status,
    isLive: rootTemplate?.publishedVersionId === version.id,
    publishedAt: version.publishedAt?.toISOString() || null,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  }));

  return responseOk(
    {
      data: formattedVersions,
      rootTemplateId: rootId,
      publishedVersionId: rootTemplate?.publishedVersionId || null,
    },
    "email_template_versions",
  );
}
