import crypto from "node:crypto";
import { ContactSourceType, ContactStatus } from "@prisma/client";
import { z } from "zod";
import { createContactSchema } from "@/app/(main)/api/v1/contacts/schema";
import { ErrorCode } from "@/lib/api/error-codes";
import { ValidationError, type ValidationErrorDetail } from "@/lib/api/errors";
import { responseCreated } from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import type { FormFieldMapping } from "@/lib/forms/field-mapping";
import { transformToContactData } from "@/lib/forms/field-mapping";
import { queue } from "@/lib/queue";

export interface SubmissionMetadata {
  ipAddress: string | null;
  userAgent: string | null;
  referrerUrl: string | null;
}

export interface DoubleOptInConfig {
  enabled: boolean;
  emailId: string | null;
}

export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateSurveyValidationSchema(
  fieldMapping: FormFieldMapping,
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

function mapSubmissionToSlots(
  data: Record<string, unknown>,
  fieldMapping: FormFieldMapping,
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

export async function handleSignUpSubmission(
  workspaceId: string,
  formId: string,
  rawData: Record<string, unknown>,
  fieldMapping: FormFieldMapping,
  metadata: SubmissionMetadata,
  doubleOptIn?: DoubleOptInConfig,
) {
  const contactData = transformToContactData(rawData, fieldMapping);

  const validationResult = createContactSchema.safeParse(contactData);

  if (!validationResult.success) {
    const errors: ValidationErrorDetail[] = validationResult.error.issues.map(
      (issue) => ({
        field: issue.path.join("."),
        code: ErrorCode.VALIDATION_FAILED,
        message: issue.message,
      }),
    );

    throw new ValidationError(
      "Validation failed",
      ErrorCode.VALIDATION_FAILED,
      errors,
    );
  }

  const {
    properties: _,
    topics: __,
    status: ___,
    ...coreContactData
  } = validationResult.data;

  const isDoubleOptInEnabled =
    doubleOptIn?.enabled === true && doubleOptIn.emailId !== null;

  const contactCreateData: Record<string, unknown> = {
    workspaceId,
    ...coreContactData,
    sourceType: ContactSourceType.FORM,
    sourceId: formId,
  };

  const contactUpdateData: Record<string, unknown> = { ...coreContactData };

  if (isDoubleOptInEnabled) {
    const confirmationToken = generateConfirmationToken();

    contactCreateData.status = ContactStatus.UNCONFIRMED;
    contactCreateData.confirmationToken = confirmationToken;
  }

  const existingContact = await prisma.contact.findUnique({
    where: {
      workspaceId_email: {
        workspaceId,
        email: coreContactData.email,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  const shouldSendConfirmation =
    isDoubleOptInEnabled &&
    (!existingContact || existingContact.status === ContactStatus.UNCONFIRMED);

  if (
    isDoubleOptInEnabled &&
    existingContact?.status === ContactStatus.UNCONFIRMED
  ) {
    const confirmationToken = generateConfirmationToken();
    contactUpdateData.confirmationToken = confirmationToken;
  }

  const contact = await prisma.contact.upsert({
    where: {
      workspaceId_email: {
        workspaceId,
        email: coreContactData.email,
      },
    },
    update: contactUpdateData,
    create: contactCreateData as Parameters<
      typeof prisma.contact.create
    >[0]["data"],
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

  if (shouldSendConfirmation && doubleOptIn?.emailId) {
    await queue("forms").push("send-double-opt-in", {
      contactId: contact.id,
      formId,
      emailId: doubleOptIn.emailId,
      workspaceId,
    });
  }

  return responseCreated({ id: submission.id }, "form_submission");
}

export async function handleSurveySubmission(
  workspaceId: string,
  formId: string,
  rawData: Record<string, unknown>,
  fieldMapping: FormFieldMapping,
  metadata: SubmissionMetadata,
) {
  const validationSchema = generateSurveyValidationSchema(fieldMapping);

  const validationResult = validationSchema.safeParse(rawData);

  if (!validationResult.success) {
    const errors: ValidationErrorDetail[] = validationResult.error.issues.map(
      (issue) => ({
        field: issue.path.join("."),
        code: ErrorCode.VALIDATION_FAILED,
        message: issue.message,
      }),
    );

    throw new ValidationError(
      "Validation failed",
      ErrorCode.VALIDATION_FAILED,
      errors,
    );
  }

  let contactId: string | null = null;

  const emailFieldName = Object.entries(fieldMapping).find(
    ([, mapping]) => mapping.contactPropertyId === "email",
  )?.[0];

  if (emailFieldName) {
    const email = rawData[emailFieldName];

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
    "form_submission",
  );
}
