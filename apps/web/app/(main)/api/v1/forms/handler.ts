/**
 * Forms Handler (External API)
 *
 * Business logic for form CRUD operations.
 * Workspace is automatically determined from the API key.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequestBody } from "@/lib/api/validation";
import { responseCreated, responseOk } from "@/lib/api/responses";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { createFormSchema, updateFormSchema } from "./schema";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import {
  extractFieldsFromSchema,
  generateFieldMapping,
  type FormFieldMapping,
} from "@/lib/forms/field-mapping";

/**
 * POST /api/v1/forms
 *
 * Create a new form for the workspace.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch validation errors.
 */
export async function createForm(workspaceId: string, request: NextRequest) {
  const data = await validateRequestBody(createFormSchema, request);

  const form = await prisma.form.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      type: data.type,
      display: data.display,
      fields: data.fields as never,
      status: "DRAFT",
      version: 1,
    },
  });

  return responseCreated(
    {
      id: form.id,
    },
    "form"
  );
}

/**
 * GET /api/v1/forms
 *
 * List all root forms for the workspace with cursor-based pagination.
 * Only returns top-level forms (parentId is null).
 * Use GET /v1/forms/{formId}/versions to get versions of a specific form.
 * Workspace is determined from the authenticated API key.
 *
 * Supports cursor-based pagination with:
 * - after: Cursor to fetch forms after this ID
 * - before: Cursor to fetch forms before this ID
 * - limit: Number of forms per page (default 20, max 100)
 */
export async function listForms(workspaceId: string, request: NextRequest) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: {
      workspaceId,
      parentId: null, // Only root forms
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
    createCursorPaginatedResponse(formattedForms, hasMore, "form_list")
  );
}

/**
 * GET /api/v1/forms/[formId]
 *
 * Get a specific form by ID.
 * Workspace is determined from the authenticated API key.
 * Returns 404 if form not found or belongs to a different workspace.
 */
export async function getForm(workspaceId: string, formId: string) {
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  return responseOk(
    {
      id: form.id,
      name: form.name,
      description: form.description,
      type: form.type,
      display: form.display,
      status: form.status,
      version: form.version,
      fields: form.fields,
      settings: form.settings,
      publishedAt: form.publishedAt?.toISOString() || null,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    },
    "form"
  );
}

/**
 * GET /api/v1/forms/[formId]/versions
 *
 * List all versions of a specific form.
 * Returns the root form and all its child versions.
 * Workspace is determined from the authenticated API key.
 */
export async function listFormVersions(workspaceId: string, formId: string) {
  // First verify the root form exists and belongs to this workspace
  const rootForm = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
      parentId: null, // Must be a root form
    },
  });

  if (!rootForm) {
    throw new NotFoundError(
      "Form not found or is not a root form",
      ErrorCode.FORM_NOT_FOUND
    );
  }

  // Get all versions (including root form)
  const versions = await prisma.form.findMany({
    where: {
      workspaceId,
      OR: [{ id: formId }, { parentId: formId }],
    },
    orderBy: {
      version: "asc",
    },
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

  return responseOk(
    {
      object: "form_version_list",
      data: formattedVersions,
    }
  );
}

/**
 * PUT /api/v1/forms/[formId]
 *
 * Update a specific form by ID.
 * Only DRAFT forms can be edited.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch validation errors and not found errors.
 */
export async function updateForm(
  workspaceId: string,
  formId: string,
  request: NextRequest
) {
  // Check if form exists and is in DRAFT status
  const existingForm = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!existingForm) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  if (existingForm.status !== "DRAFT") {
    throw new BadRequestError(
      "Only forms in DRAFT status can be edited. Published or archived forms cannot be modified.",
      ErrorCode.FORM_NOT_EDITABLE
    );
  }

  const data = await validateRequestBody(updateFormSchema, request);

  const updatedForm = await prisma.form.update({
    where: {
      id: formId,
      workspaceId,
    },
    data: {
      ...data,
      ...(data.fields !== undefined && { fields: data.fields as never }),
      ...(data.settings !== undefined && { settings: data.settings as never }),
    },
  });

  return responseOk(
    {
      id: updatedForm.id,
    },
    "form"
  );
}

/**
 * DELETE /api/v1/forms/[formId]
 *
 * Delete a specific form by ID.
 * Workspace is determined from the authenticated API key.
 * Returns 404 if form not found or belongs to a different workspace.
 * Cascade deletes all form submissions and child versions (if root form).
 *
 * Note: For root forms (parentId=null), we explicitly delete child versions first
 * to avoid foreign key constraint issues with publishedVersionId.
 */
export async function deleteForm(workspaceId: string, formId: string) {
  // Find the form first to check if it's a root form
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  // If it's a root form (parentId=null), delete all child versions first
  if (!form.parentId) {
    // Clear publishedVersionId on root form to avoid circular reference
    await prisma.form.updateMany({
      where: {
        id: formId,
        workspaceId,
      },
      data: {
        publishedVersionId: null,
      },
    });

    // Delete all child versions (forms where parentId = formId)
    // FK constraint with ON DELETE CASCADE should handle this, but we do it explicitly
    await prisma.form.deleteMany({
      where: {
        parentId: formId,
        workspaceId,
      },
    });
  }

  // Delete the form itself (FK constraint will handle publishedVersionId ON DELETE SET NULL)
  const deletedForm = await prisma.form.delete({
    where: {
      id: formId,
      workspaceId,
    },
  });

  return responseOk(
    {
      id: deletedForm.id,
    },
    "form"
  );
}

/**
 * POST /api/v1/forms/[formId]/versions
 *
 * Create a new version of a form.
 * All fields are optional - if not provided, they are derived from the parent form.
 * New version is created with status DRAFT and incremented version number.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch validation errors and not found errors.
 */
export async function createFormVersion(
  workspaceId: string,
  formId: string,
  request: NextRequest
) {
  // Find the source form
  const sourceForm = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!sourceForm) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  // Determine the root parent ID
  // If the source form is itself a version (has a parentId), use that
  // Otherwise, the source form is the root, so use its ID
  const rootParentId = sourceForm.parentId || sourceForm.id;

  // Check if a DRAFT version already exists for this parent
  // Due to unique constraint: @@unique([workspaceId, parentId, status])
  // Only one DRAFT version can exist per parent
  const existingDraft = await prisma.form.findFirst({
    where: {
      parentId: rootParentId,
      status: "DRAFT",
      workspaceId,
    },
  });

  if (existingDraft) {
    throw new ConflictError(
      "A DRAFT version already exists for this form. Please publish or delete it before creating a new version.",
      ErrorCode.FORM_HAS_DRAFT_VERSION
    );
  }

  const allVersions = await prisma.form.findMany({
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

  const data = await validateRequestBody(updateFormSchema, request);

  const newVersion = await prisma.form.create({
    data: {
      workspaceId,
      parentId: rootParentId,
      version: nextVersion,
      name: data.name ?? sourceForm.name,
      description: data.description ?? sourceForm.description,
      type: data.type ?? sourceForm.type,
      display: data.display ?? sourceForm.display,
      fields: (data.fields ?? sourceForm.fields) as never,
      settings: sourceForm.settings as never,
      status: "DRAFT",
    },
  });

  return responseCreated(
    {
      id: newVersion.id,
    },
    "form"
  );
}

/**
 * POST /api/v1/forms/[formId]/publish
 *
 * Publish a form.
 * - For root forms (parentId=null): Sets status to PUBLISHED and publishedVersionId to self
 * - For versions (parentId!=null): Archives old published version, publishes new version, updates root's publishedVersionId
 * - Generates field mapping at publish time for form submissions
 * Workspace is determined from the authenticated API key.
 */
export async function publishForm(workspaceId: string, formId: string) {
  // Find the form to publish
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  // Check if already published
  if (form.status === "PUBLISHED") {
    throw new BadRequestError(
      "Form is already published",
      ErrorCode.FORM_ALREADY_PUBLISHED
    );
  }

  // Check if form has at least one field
  const fields = extractFieldsFromSchema(form.fields);
  if (fields.length === 0) {
    throw new BadRequestError(
      "Cannot publish a form with no fields. Add at least one field before publishing.",
      ErrorCode.FORM_NO_FIELDS
    );
  }

  // Check for required email field with name "email"
  const emailField = fields.find((field) => field.name === "email");
  if (!emailField) {
    throw new BadRequestError(
      "Form must have an email field with the name 'email' to be published.",
      ErrorCode.FORM_MISSING_EMAIL_FIELD
    );
  }

  // Root form (first publish)
  if (!form.parentId) {
    // Generate field mapping for this form
    // For root forms, we start with a fresh mapping
    const fieldMapping = generateFieldMapping(form.fields, null);

    const updatedForm = await prisma.form.update({
      where: {
        id: formId,
        workspaceId,
      },
      data: {
        status: "PUBLISHED",
        publishedVersionId: formId, // Self-reference
        publishedAt: new Date(),
        fieldMapping: fieldMapping as never,
      },
    });

    return responseOk(
      {
        id: updatedForm.id,
      },
      "form"
    );
  }

  // Version form - need to handle publishing logic
  const rootParentId = form.parentId;

  // Get the root form to access existing field mapping
  const rootForm = await prisma.form.findUnique({
    where: { id: rootParentId },
  });

  if (!rootForm) {
    throw new NotFoundError("Parent form not found", ErrorCode.FORM_NOT_FOUND);
  }

  // Generate field mapping, preserving existing slot assignments from root form
  // This ensures that existing fields keep their slots across versions
  const existingMapping = rootForm.fieldMapping as FormFieldMapping | null;
  const fieldMapping = generateFieldMapping(form.fields, existingMapping);

  // Find currently published version for this parent
  const currentlyPublished = await prisma.form.findFirst({
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
      await tx.form.update({
        where: {
          id: currentlyPublished.id,
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    // Archive the root form if it's currently published
    // The root form is also version 1, so when we publish version 2+, version 1 should be archived
    if (rootForm.status === "PUBLISHED") {
      await tx.form.update({
        where: {
          id: rootParentId,
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    // Publish the new version with field mapping
    await tx.form.update({
      where: {
        id: formId,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        fieldMapping: fieldMapping as never,
      },
    });

    // Update root form's publishedVersionId and field mapping
    // The root form always holds the latest/canonical field mapping
    await tx.form.update({
      where: {
        id: rootParentId,
      },
      data: {
        publishedVersionId: formId,
        fieldMapping: fieldMapping as never,
      },
    });
  });

  return responseOk(
    {
      id: formId,
    },
    "form"
  );
}
