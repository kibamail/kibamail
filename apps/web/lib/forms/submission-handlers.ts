/**
 * Shared Form Submission Handlers
 *
 * Common business logic for processing form submissions.
 * Used by both external API and internal API endpoints.
 */

import { z } from "zod";
import { ContactSourceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { responseCreated } from "@/lib/api/responses";
import { ValidationError, type ValidationErrorDetail } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import type { FormFieldMapping } from "@/lib/forms/field-mapping";
import { createContactSchema } from "@/app/api/v1/contacts/schema";

/**
 * Submission metadata from request headers
 */
export interface SubmissionMetadata {
  ipAddress: string | null;
  userAgent: string | null;
  referrerUrl: string | null;
}

/**
 * Generates a dynamic Zod schema based on form fields for SURVEY forms.
 * All fields are treated as optional strings or numbers.
 */
export function generateSurveyValidationSchema(
  fieldMapping: FormFieldMapping
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [fieldName, mapping] of Object.entries(fieldMapping)) {
    if (mapping.type === "number") {
      shape[fieldName] = z.coerce.number().optional().nullable();
    } else {
      shape[fieldName] = z.string().optional().nullable();
    }
  }

  return z.object(shape).passthrough();
}

/**
 * Maps submission data to slot columns using field mapping
 */
export function mapSubmissionToSlots(
  data: Record<string, unknown>,
  fieldMapping: FormFieldMapping
): Record<string, string | number | null> {
  const slotData: Record<string, string | number | null> = {};

  for (const [fieldName, value] of Object.entries(data)) {
    const mapping = fieldMapping[fieldName];
    if (!mapping) continue;

    if (value === null || value === undefined) {
      slotData[mapping.slot] = null;
      continue;
    }

    if (mapping.type === "number") {
      slotData[mapping.slot] = Number(value);
      continue;
    }

    slotData[mapping.slot] = String(value);
  }

  return slotData;
}

/**
 * Handles SIGN_UP form submissions
 * Creates or updates a contact and creates a form submission record
 */
export async function handleSignUpSubmission(
  workspaceId: string,
  formId: string,
  rawData: Record<string, unknown>,
  fieldMapping: FormFieldMapping,
  metadata: SubmissionMetadata
) {
  const validationResult = createContactSchema.safeParse(rawData);

  if (!validationResult.success) {
    const errors: ValidationErrorDetail[] = validationResult.error.issues.map(
      (issue) => ({
        field: issue.path.join("."),
        code: ErrorCode.VALIDATION_FAILED,
        message: issue.message,
      })
    );

    throw new ValidationError(
      "Validation failed",
      ErrorCode.VALIDATION_FAILED,
      errors
    );
  }

  const {
    properties: _,
    topics: __,
    ...coreContactData
  } = validationResult.data;

  // Upsert contact using email + workspaceId as unique key
  const contact = await prisma.contact.upsert({
    where: {
      workspaceId_email: {
        workspaceId,
        email: coreContactData.email,
      },
    },
    update: coreContactData,
    create: {
      workspaceId,
      ...coreContactData,
      sourceType: ContactSourceType.FORM,
      sourceId: formId,
    },
  });

  const slotData = mapSubmissionToSlots(rawData, fieldMapping);

  const submission = await prisma.formSubmission.create({
    data: {
      formId,
      workspaceId,
      contactId: contact.id,
      status: "PROCESSED",
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      referrerUrl: metadata.referrerUrl,
      ...slotData,
    },
  });

  return responseCreated({ id: submission.id }, "form_submission");
}

/**
 * Handles SURVEY form submissions
 * Creates a form submission record and optionally links to existing contact by email
 */
export async function handleSurveySubmission(
  workspaceId: string,
  formId: string,
  rawData: Record<string, unknown>,
  fieldMapping: FormFieldMapping,
  metadata: SubmissionMetadata
) {
  const validationSchema = generateSurveyValidationSchema(fieldMapping);

  const validationResult = validationSchema.safeParse(rawData);

  if (!validationResult.success) {
    const errors: ValidationErrorDetail[] = validationResult.error.issues.map(
      (issue) => ({
        field: issue.path.join("."),
        code: ErrorCode.VALIDATION_FAILED,
        message: issue.message,
      })
    );

    throw new ValidationError(
      "Validation failed",
      ErrorCode.VALIDATION_FAILED,
      errors
    );
  }

  // Try to find existing contact if form has an "email" field
  let contactId: string | null = null;

  if ("email" in fieldMapping) {
    const email = rawData.email;

    if (typeof email === "string" && email.includes("@")) {
      const contact = await prisma.contact.findUnique({
        where: {
          workspaceId_email: {
            workspaceId,
            email,
          },
        },
        select: { id: true },
      });

      if (contact) {
        contactId = contact.id;
      }
    }
  }

  const slotData = mapSubmissionToSlots(rawData, fieldMapping);

  const submission = await prisma.formSubmission.create({
    data: {
      formId,
      workspaceId,
      contactId,
      status: "PROCESSED",
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      referrerUrl: metadata.referrerUrl,
      ...slotData,
    },
  });

  return responseCreated(
    {
      id: submission.id,
    },
    "form_submission"
  );
}
