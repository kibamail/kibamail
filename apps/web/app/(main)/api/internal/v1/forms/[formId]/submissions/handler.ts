import { NextResponse, type NextRequest } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import type { FormSettings } from "@/lib/forms/settings-schema";
import type { FormFieldMapping } from "@/lib/forms/field-mapping";
import {
  type DoubleOptInConfig,
  handleSignUpSubmission,
  handleSurveySubmission,
} from "@/lib/forms/submission-handlers";

/**
 * Build a redirect URL back to the form page with encoded state.
 */
function buildRedirectUrl(
  formId: string,
  status: "success" | "error",
  opts?: {
    errors?: Record<string, string>;
    message?: string;
    values?: Record<string, string>;
  },
): string {
  const params = new URLSearchParams({ status });

  if (opts?.errors) {
    params.set(
      "errors",
      Buffer.from(JSON.stringify(opts.errors)).toString("base64url"),
    );
  }

  if (opts?.message) {
    params.set(
      "message",
      Buffer.from(opts.message).toString("base64url"),
    );
  }

  if (opts?.values) {
    params.set(
      "values",
      Buffer.from(JSON.stringify(opts.values)).toString("base64url"),
    );
  }

  return `/p/forms/${formId}?${params.toString()}`;
}

/**
 * Parse the request body based on content type.
 * Supports application/x-www-form-urlencoded (browser forms) and application/json (API).
 */
async function parseRequestBody(
  request: NextRequest,
): Promise<{ data: Record<string, unknown>; isFormPost: boolean }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        data[key] = value;
      }
    }
    return { data, isFormPost: true };
  }

  const data = await request.json();
  return { data, isFormPost: false };
}

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
  const { data: rawData, isFormPost } = await parseRequestBody(request);

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") || null;
  const referrerUrl = request.headers.get("referer") || null;

  const formSettings = publishedForm.settings as FormSettings | null;

  try {
    if (publishedForm.type === "SIGN_UP") {
      const doubleOptIn: DoubleOptInConfig = {
        enabled: formSettings?.doubleOptIn?.enabled ?? false,
        emailId: form.doubleOptInEmailId,
      };

      const result = await handleSignUpSubmission(
        workspaceId,
        form.id,
        rawData,
        fieldMapping,
        { ipAddress, userAgent, referrerUrl },
        doubleOptIn,
      );

      if (!isFormPost) return result;

      // Redirect on success
      const successAction = formSettings?.successAction;
      if (successAction?.type === "redirect") {
        return NextResponse.redirect(successAction.url, 302);
      }
      return NextResponse.redirect(
        new URL(buildRedirectUrl(form.id, "success"), request.url),
        302,
      );
    }

    const result = await handleSurveySubmission(
      workspaceId,
      form.id,
      rawData,
      fieldMapping,
      { ipAddress, userAgent, referrerUrl },
    );

    if (!isFormPost) return result;

    const successAction = formSettings?.successAction;
    if (successAction?.type === "redirect") {
      return NextResponse.redirect(successAction.url, 302);
    }
    return NextResponse.redirect(
      new URL(buildRedirectUrl(form.id, "success"), request.url),
      302,
    );
  } catch (error) {
    if (!isFormPost) throw error;

    // For form POST, redirect back with error state
    const values = rawData as Record<string, string>;

    if (error instanceof BadRequestError || (error as { statusCode?: number })?.statusCode === 422) {
      // Validation error
      const validationErrors: Record<string, string> = {};
      const err = error as { validationErrors?: Array<{ field: string; message: string }> };
      if (err.validationErrors) {
        for (const ve of err.validationErrors) {
          validationErrors[ve.field] = ve.message;
        }
      }
      return NextResponse.redirect(
        new URL(
          buildRedirectUrl(form.id, "error", {
            errors: Object.keys(validationErrors).length > 0 ? validationErrors : undefined,
            message: Object.keys(validationErrors).length === 0 ? (error as Error).message : undefined,
            values,
          }),
          request.url,
        ),
        302,
      );
    }

    return NextResponse.redirect(
      new URL(
        buildRedirectUrl(form.id, "error", {
          message: "An unexpected error occurred. Please try again.",
          values,
        }),
        request.url,
      ),
      302,
    );
  }
}
