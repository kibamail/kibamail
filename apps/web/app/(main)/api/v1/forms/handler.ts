/**
 * Forms Handler (External API)
 *
 * Business logic for form CRUD operations.
 * Workspace is automatically determined from the API key.
 *
 * Content (HTML) is uploaded via the deploy endpoint, not here.
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
import { validateEmailCompliance } from "@/lib/emails/compliance-validation";
import {
  type FormFieldMapping,
  generateFieldMappingFromApiMapping,
} from "@/lib/forms/field-mapping";
import {
  type ApiFieldMapping,
  validateHtmlFieldMapping,
} from "@/lib/forms/html-validation";
import { createFormSchema, updateFormSchema } from "./schema";

/**
 * Content stored in the `fields` column after deploy.
 */
interface FormContent {
  html: string;
  deployId: string;
  files: Array<{ name: string; url: string; size: number; type: string }>;
}

/**
 * POST /api/v1/forms
 *
 * Create a new form. Content is uploaded separately via the deploy endpoint.
 */
export async function createForm(workspaceId: string, request: NextRequest) {
  const data = await validateRequestBody(createFormSchema, request);

  const formId = crypto.randomUUID();

  const form = await prisma.form.create({
    data: {
      id: formId,
      workspaceId,
      name: data.name,
      description: data.description,
      type: data.type,
      display: data.display,
      fieldMapping: data.fieldMapping as never,
      settings: (data.settings ?? {}) as never,
      status: "DRAFT",
      version: 1,
    },
  });

  return responseCreated({ id: form.id }, "form");
}

/**
 * GET /api/v1/forms
 *
 * List all root forms for the workspace with cursor-based pagination.
 */
export async function listForms(workspaceId: string, request: NextRequest) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: {
      workspaceId,
      parentId: null,
    },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const forms = after
    ? await prisma.form.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.form.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.form.findMany(baseQuery);

  const hasMore = forms.length > limit;
  const items = hasMore ? forms.slice(0, -1) : forms;

  if (before) {
    items.reverse();
  }

  const formattedForms = items.map((form) => ({
    id: form.id,
    name: form.name,
    description: form.description,
    type: form.type,
    display: form.display,
    status: form.status,
  }));

  return responseOk(
    createCursorPaginatedResponse(formattedForms, hasMore, "form_list"),
  );
}

/**
 * GET /api/v1/forms/[formId]
 *
 * Get a specific form by ID.
 */
export async function getForm(workspaceId: string, formId: string) {
  const form = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  const content = form.fields as FormContent | null;

  return responseOk(
    {
      id: form.id,
      name: form.name,
      description: form.description,
      type: form.type,
      display: form.display,
      status: form.status,
      version: form.version,
      html: content?.html ?? null,
      deployId: content?.deployId ?? null,
      deployedFiles: content?.files ?? null,
      fieldMapping: form.fieldMapping,
      settings: form.settings,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      seoImageUrl: form.seoImageUrl,
      seoFaviconUrl: form.seoFaviconUrl,
      slug: form.slug,
      publishedAt: form.publishedAt?.toISOString() || null,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    },
    "form",
  );
}

/**
 * GET /api/v1/forms/[formId]/versions
 *
 * List all versions of a specific form.
 */
export async function listFormVersions(workspaceId: string, formId: string) {
  const rootForm = await prisma.form.findFirst({
    where: { id: formId, workspaceId, parentId: null },
  });

  if (!rootForm) {
    throw new NotFoundError(
      "Form not found or is not a root form",
      ErrorCode.FORM_NOT_FOUND,
    );
  }

  const versions = await prisma.form.findMany({
    where: {
      workspaceId,
      OR: [{ id: formId }, { parentId: formId }],
    },
    orderBy: { version: "asc" },
  });

  const formattedVersions = versions.map((version) => ({
    id: version.id,
    name: version.name,
    description: version.description,
    type: version.type,
    display: version.display,
    status: version.status,
    version: version.version,
  }));

  return responseOk({
    object: "form_version_list",
    data: formattedVersions,
  });
}

/**
 * PUT /api/v1/forms/[formId]
 *
 * Update a specific form by ID. Only DRAFT forms can be edited.
 */
export async function updateForm(
  workspaceId: string,
  formId: string,
  request: NextRequest,
) {
  const existingForm = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
  });

  if (!existingForm) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  if (existingForm.status !== "DRAFT") {
    throw new BadRequestError(
      "Only forms in DRAFT status can be edited. Published or archived forms cannot be modified.",
      ErrorCode.FORM_NOT_EDITABLE,
    );
  }

  const data = await validateRequestBody(updateFormSchema, request);

  // If fieldMapping changes and form has deployed HTML, re-validate
  if (data.fieldMapping) {
    const content = existingForm.fields as FormContent | null;
    if (content?.html) {
      const newType = data.type ?? existingForm.type;
      const validation = validateHtmlFieldMapping(
        content.html,
        data.fieldMapping as ApiFieldMapping,
        newType,
      );
      if (!validation.valid) {
        throw new BadRequestError(
          validation.errors.map((e) => e.message).join("; "),
          ErrorCode.FORM_VALIDATION_ERROR,
        );
      }
    }
  }

  // Validate slug uniqueness
  if (data.slug !== undefined && data.slug !== null && data.slug !== "") {
    const existingFormWithSlug = await prisma.form.findFirst({
      where: { workspaceId, slug: data.slug, id: { not: formId } },
    });

    if (existingFormWithSlug) {
      throw new ConflictError(
        `A form with the slug "${data.slug}" already exists in this workspace`,
        ErrorCode.FORM_SLUG_CONFLICT,
      );
    }
  }

  const updatedForm = await prisma.form.update({
    where: { id: formId, workspaceId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.display !== undefined && { display: data.display }),
      ...(data.fieldMapping !== undefined && {
        fieldMapping: data.fieldMapping as never,
      }),
      ...(data.settings !== undefined && { settings: data.settings as never }),
      ...(data.doubleOptInEmailId !== undefined && {
        doubleOptInEmailId: data.doubleOptInEmailId,
      }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
      ...(data.seoDescription !== undefined && {
        seoDescription: data.seoDescription,
      }),
      ...(data.seoImageUrl !== undefined && { seoImageUrl: data.seoImageUrl }),
      ...(data.seoFaviconUrl !== undefined && {
        seoFaviconUrl: data.seoFaviconUrl,
      }),
      ...(data.slug !== undefined && { slug: data.slug }),
    },
  });

  return responseOk({ id: updatedForm.id }, "form");
}

/**
 * DELETE /api/v1/forms/[formId]
 *
 * Delete a specific form by ID. Only DRAFT forms can be deleted.
 */
export async function deleteForm(workspaceId: string, formId: string) {
  const form = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  if (form.status !== "DRAFT") {
    throw new BadRequestError(
      "Only forms in DRAFT status can be deleted. Published or archived forms cannot be deleted.",
      ErrorCode.FORM_NOT_DELETABLE,
    );
  }

  if (!form.parentId) {
    await prisma.form.updateMany({
      where: { id: formId, workspaceId },
      data: { publishedVersionId: null },
    });

    await prisma.form.deleteMany({
      where: { parentId: formId, workspaceId },
    });
  }

  const deletedForm = await prisma.form.delete({
    where: { id: formId, workspaceId },
  });

  return responseOk({ id: deletedForm.id }, "form");
}

/**
 * POST /api/v1/forms/[formId]/versions
 *
 * Create a new version of a form. Inherits content from the parent.
 */
export async function createFormVersion(
  workspaceId: string,
  formId: string,
  request: NextRequest,
) {
  const sourceForm = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
  });

  if (!sourceForm) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  const rootParentId = sourceForm.parentId || sourceForm.id;

  const existingDraft = await prisma.form.findFirst({
    where: { parentId: rootParentId, status: "DRAFT", workspaceId },
  });

  if (existingDraft) {
    throw new ConflictError(
      "A DRAFT version already exists for this form. Please publish or delete it before creating a new version.",
      ErrorCode.FORM_HAS_DRAFT_VERSION,
    );
  }

  const allVersions = await prisma.form.findMany({
    where: {
      OR: [{ id: rootParentId }, { parentId: rootParentId }],
      workspaceId,
    },
    select: { version: true },
  });

  const maxVersion = Math.max(...allVersions.map((v) => v.version));
  const nextVersion = maxVersion + 1;

  const data = await validateRequestBody(updateFormSchema, request);

  const newFieldMapping =
    (data.fieldMapping as ApiFieldMapping | undefined) ??
    (sourceForm.fieldMapping as ApiFieldMapping | null);

  const newVersion = await prisma.form.create({
    data: {
      workspaceId,
      parentId: rootParentId,
      version: nextVersion,
      name: data.name ?? sourceForm.name,
      description: data.description ?? sourceForm.description,
      type: data.type ?? sourceForm.type,
      display: data.display ?? sourceForm.display,
      fields: sourceForm.fields as never,
      fieldMapping: newFieldMapping as never,
      settings: (data.settings ?? sourceForm.settings) as never,
      status: "DRAFT",
      doubleOptInEmailId: sourceForm.doubleOptInEmailId,
      seoTitle: sourceForm.seoTitle,
      seoDescription: sourceForm.seoDescription,
      seoImageUrl: sourceForm.seoImageUrl,
      seoFaviconUrl: sourceForm.seoFaviconUrl,
    },
  });

  return responseCreated({ id: newVersion.id }, "form");
}

/**
 * POST /api/v1/forms/[formId]/publish
 *
 * Publish a form. Requires deployed content (HTML).
 */
export async function publishForm(workspaceId: string, formId: string) {
  const form = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  if (form.status === "PUBLISHED") {
    throw new BadRequestError(
      "Form is already published",
      ErrorCode.FORM_ALREADY_PUBLISHED,
    );
  }

  const content = form.fields as FormContent | null;

  const apiFieldMapping = form.fieldMapping as ApiFieldMapping | null;

  if (!apiFieldMapping || Object.keys(apiFieldMapping).length === 0) {
    throw new BadRequestError(
      "Cannot publish a form without a fieldMapping.",
      ErrorCode.FORM_NO_FIELDS,
    );
  }

  // Validate double opt-in email when enabled
  const settings = form.settings as Record<string, unknown> | null;
  const doubleOptIn = settings?.doubleOptIn as { enabled?: boolean } | undefined;

  if (doubleOptIn?.enabled) {
    if (!form.doubleOptInEmailId) {
      throw new BadRequestError(
        "Double opt-in is enabled but no confirmation email is linked. Create a marketing email and link it via doubleOptInEmailId.",
        ErrorCode.FORM_VALIDATION_ERROR,
      );
    }

    const email = await prisma.email.findFirst({
      where: { id: form.doubleOptInEmailId, workspaceId },
    });

    if (!email) {
      throw new BadRequestError(
        "The linked double opt-in email was not found.",
        ErrorCode.FORM_VALIDATION_ERROR,
      );
    }

    if (!email.subject) {
      throw new BadRequestError(
        "The double opt-in email is missing a subject line. Update the email before publishing.",
        ErrorCode.FORM_VALIDATION_ERROR,
      );
    }

    if (!email.htmlContent && !email.content) {
      throw new BadRequestError(
        "The double opt-in email has no content. Add HTML content to the email before publishing.",
        ErrorCode.FORM_VALIDATION_ERROR,
      );
    }

    if (email.htmlContent) {
      const compliance = validateEmailCompliance(email.htmlContent);
      if (!compliance.valid) {
        throw new BadRequestError(
          `Double opt-in email is missing required compliance variables: ${compliance.missing.join(", ")}`,
          ErrorCode.FORM_VALIDATION_ERROR,
        );
      }
    }
  }

  // Validate HTML + fieldMapping only when site content has been deployed
  if (content?.html) {
    const validation = validateHtmlFieldMapping(
      content.html,
      apiFieldMapping,
      form.type,
    );
    if (!validation.valid) {
      throw new BadRequestError(
        validation.errors.map((e) => e.message).join("; "),
        ErrorCode.FORM_VALIDATION_ERROR,
      );
    }
  }

  // Root form (first publish)
  if (!form.parentId) {
    const rawMapping = form.fieldMapping as Record<string, unknown> | null;
    const firstEntry = rawMapping ? Object.values(rawMapping)[0] as Record<string, unknown> | undefined : undefined;
    const hasSlots = firstEntry && typeof firstEntry.slot === "string";
    const existingSlotMapping = hasSlots ? (rawMapping as unknown as FormFieldMapping) : null;

    const slotMapping = generateFieldMappingFromApiMapping(
      apiFieldMapping,
      existingSlotMapping,
    );

    await prisma.$transaction(async (tx) => {
      await tx.form.updateMany({
        where: { parentId: formId, status: "PUBLISHED", workspaceId },
        data: { status: "ARCHIVED" },
      });

      await tx.form.update({
        where: { id: formId, workspaceId },
        data: {
          status: "PUBLISHED",
          publishedVersionId: formId,
          publishedAt: new Date(),
          fieldMapping: slotMapping as never,
        },
      });
    });

    return responseOk({ id: formId }, "form");
  }

  // Version form
  const rootParentId = form.parentId;

  const rootForm = await prisma.form.findUnique({
    where: { id: rootParentId },
  });

  if (!rootForm) {
    throw new NotFoundError("Parent form not found", ErrorCode.FORM_NOT_FOUND);
  }

  const existingSlotMapping = rootForm.fieldMapping as FormFieldMapping | null;
  const slotMapping = generateFieldMappingFromApiMapping(
    apiFieldMapping,
    existingSlotMapping,
  );

  const currentlyPublished = await prisma.form.findFirst({
    where: { parentId: rootParentId, status: "PUBLISHED", workspaceId },
  });

  await prisma.$transaction(async (tx) => {
    if (currentlyPublished) {
      await tx.form.update({
        where: { id: currentlyPublished.id },
        data: { status: "ARCHIVED" },
      });
    }

    if (rootForm.status === "PUBLISHED") {
      await tx.form.update({
        where: { id: rootParentId },
        data: { status: "ARCHIVED" },
      });
    }

    await tx.form.update({
      where: { id: formId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        fieldMapping: slotMapping as never,
      },
    });

    await tx.form.update({
      where: { id: rootParentId },
      data: {
        publishedVersionId: formId,
        fieldMapping: slotMapping as never,
      },
    });
  });

  return responseOk({ id: formId }, "form");
}
