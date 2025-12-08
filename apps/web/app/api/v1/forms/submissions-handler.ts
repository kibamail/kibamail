/**
 * Form Submissions Handler (External API)
 *
 * Business logic for form submission operations.
 * Handles both SIGN_UP and SURVEY form types differently:
 * - SIGN_UP: Creates/updates a contact with sourceType: FORM
 * - SURVEY: Creates a FormSubmission record using field mapping
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
 * POST /api/v1/forms/[formId]/submissions
 *
 * Submit data to a form.
 * - For SIGN_UP forms: Creates or updates a contact (requires email field)
 * - For SURVEY forms: Creates a FormSubmission record
 *
 * @param workspaceId - Workspace ID from API key
 * @param formId - Form ID from URL parameter
 * @param request - Next.js request object
 */
export async function createFormSubmission(
  workspaceId: string,
  formId: string,
  request: NextRequest
) {
  // Fetch the form with its published version (filtered by workspace for external API)
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
      parentId: null, // Must be a root form
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
