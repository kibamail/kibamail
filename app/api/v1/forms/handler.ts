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

  // Root form (first publish)
  if (!form.parentId) {
    const updatedForm = await prisma.form.update({
      where: {
        id: formId,
        workspaceId,
      },
      data: {
        status: "PUBLISHED",
        publishedVersionId: formId, // Self-reference
        publishedAt: new Date(),
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
    const rootForm = await tx.form.findUnique({
      where: { id: rootParentId },
    });

    if (rootForm?.status === "PUBLISHED") {
      await tx.form.update({
        where: {
          id: rootParentId,
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    // Publish the new version
    await tx.form.update({
      where: {
        id: formId,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    // Update root form's publishedVersionId to point to this version
    await tx.form.update({
      where: {
        id: rootParentId,
      },
      data: {
        publishedVersionId: formId,
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
