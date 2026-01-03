import type { NextRequest } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import type { FormSettings } from "@/lib/form-builder/schema";
import type { FormFieldMapping } from "@/lib/forms/field-mapping";
import {
  type DoubleOptInConfig,
  handleSignUpSubmission,
  handleSurveySubmission,
} from "@/lib/forms/submission-handlers";

export async function createPublicFormSubmission(
  formId: string,
  request: NextRequest,
) {
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      parentId: null,
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
      ErrorCode.FORM_NOT_EDITABLE,
    );
  }

  const fieldMapping = publishedForm.fieldMapping as FormFieldMapping | null;

  if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
    throw new BadRequestError(
      "Form has no field mapping. This form may not have been published correctly.",
      ErrorCode.FORM_NO_FIELDS,
    );
  }

  const workspaceId = form.workspaceId;

  const rawData = await request.json();

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") || null;
  const referrerUrl = request.headers.get("referer") || null;

  if (publishedForm.type === "SIGN_UP") {
    const formSettings = publishedForm.settings as FormSettings | null;
    const doubleOptIn: DoubleOptInConfig = {
      enabled: formSettings?.doubleOptIn?.enabled ?? false,
      emailId: form.doubleOptInEmailId,
    };

    return handleSignUpSubmission(
      workspaceId,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress,
        userAgent,
        referrerUrl,
      },
      doubleOptIn,
    );
  }

  return handleSurveySubmission(workspaceId, form.id, rawData, fieldMapping, {
    ipAddress,
    userAgent,
    referrerUrl,
  });
}
