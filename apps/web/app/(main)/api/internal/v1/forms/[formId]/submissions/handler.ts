/**
 * Public Form Submissions Handler (Internal API)
 *
 * Business logic for public form submission operations.
 * Similar to the external API but designed for public form pages.
 *
 * Key differences from external API:
 * - No authentication required
 * - WorkspaceId is derived from the form record
 * - Form lookup doesn't filter by workspace
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import type { FormFieldMapping } from "@/lib/forms/field-mapping";
import {
  handleSignUpSubmission,
  handleSurveySubmission,
} from "@/lib/forms/submission-handlers";

/**
 * POST /api/internal/v1/forms/[formId]/submissions
 *
 * Submit data to a public form.
 * - For SIGN_UP forms: Creates or updates a contact (requires email field)
 * - For SURVEY forms: Creates a FormSubmission record
 *
 * @param formId - Form ID from URL parameter
 * @param request - Next.js request object
 */
export async function createPublicFormSubmission(
  formId: string,
  request: NextRequest
) {
  // Fetch the form without workspace filtering (public access)
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      parentId: null, // Must be a root form
      deletedAt: null,
    },
    include: {
      publishedVersion: true,
    },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  const publishedForm = form.publishedVersion;

  if (!publishedForm) {
    throw new BadRequestError(
      "Form is not published. Only published forms can accept submissions.",
      ErrorCode.FORM_NOT_EDITABLE
    );
  }

  const fieldMapping = publishedForm.fieldMapping as FormFieldMapping | null;

  if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
    throw new BadRequestError(
      "Form has no field mapping. This form may not have been published correctly.",
      ErrorCode.FORM_NO_FIELDS
    );
  }

  // Get workspaceId from the form (since this is a public endpoint)
  const workspaceId = form.workspaceId;

  const rawData = await request.json();

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") || null;
  const referrerUrl = request.headers.get("referer") || null;

  if (publishedForm.type === "SIGN_UP") {
    return handleSignUpSubmission(workspaceId, form.id, rawData, fieldMapping, {
      ipAddress,
      userAgent,
      referrerUrl,
    });
  }

  return handleSurveySubmission(workspaceId, form.id, rawData, fieldMapping, {
    ipAddress,
    userAgent,
    referrerUrl,
  });
}
