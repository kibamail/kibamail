/**
 * Contact Import [id] - Handler
 *
 * Business logic for /api/internal/v1/contact-imports/:id endpoint
 */

import {
  type ContactImportResponse,
  type UpdateContactImportResponse,
  updateContactImportSchema,
} from "@/app/(main)/api/internal/v1/contact-imports/schema";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { checkImportReadiness } from "@/lib/contact-imports";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";

/**
 * GET /api/internal/v1/contact-imports/:id
 *
 * Get a contact import by ID
 */
export async function getContactImport(
  session: UserSession,
  contactImportId: string,
) {
  const workspaceId = session.currentOrganization.id;

  const contactImport = await prisma.contactImport.findFirst({
    where: {
      id: contactImportId,
      workspaceId,
    },
  });

  if (!contactImport) {
    throw new NotFoundError("Contact import not found");
  }

  const response: ContactImportResponse = {
    id: contactImport.id,
    fileKey: contactImport.fileKey,
    fileName: contactImport.fileName,
    fileSize: contactImport.fileSize,
    status: contactImport.status,
    columnMapping: contactImport.columnMapping as Record<string, string> | null,
    topicIds: contactImport.topicIds as string[],
    autoSubscribe: contactImport.autoSubscribe,
    updateExisting: contactImport.updateExisting,
    totalRows: contactImport.totalRows,
    processedRows: contactImport.processedRows,
    createdCount: contactImport.createdCount,
    updatedCount: contactImport.updatedCount,
    skippedCount: contactImport.skippedCount,
    failedCount: contactImport.failedCount,
    errorMessage: contactImport.errorMessage,
    startedAt: contactImport.startedAt?.toISOString() ?? null,
    completedAt: contactImport.completedAt?.toISOString() ?? null,
    createdAt: contactImport.createdAt.toISOString(),
    updatedAt: contactImport.updatedAt.toISOString(),
  };

  return responseOk(response);
}

/**
 * PATCH /api/internal/v1/contact-imports/:id
 *
 * Update a contact import with column mapping and settings.
 * This finalizes the import configuration before processing.
 */
export async function updateContactImport(
  session: UserSession,
  contactImportId: string,
  request: Request,
) {
  const workspaceId = session.currentOrganization.id;

  const existingImport = await prisma.contactImport.findFirst({
    where: {
      id: contactImportId,
      workspaceId,
    },
  });

  if (!existingImport) {
    throw new NotFoundError("Contact import not found");
  }

  if (existingImport.status !== "PENDING") {
    throw new BadRequestError(
      `Cannot update contact import with status "${existingImport.status}". Only PENDING imports can be updated.`,
    );
  }

  const body = await request.json();
  const validatedData = updateContactImportSchema.parse(body);

  const updatedImport = await prisma.contactImport.update({
    where: { id: contactImportId },
    data: {
      ...(validatedData.columnMapping && {
        columnMapping: validatedData.columnMapping,
      }),
      ...(validatedData.topicIds && { topicIds: validatedData.topicIds }),
      ...(validatedData.autoSubscribe !== undefined && {
        autoSubscribe: validatedData.autoSubscribe,
      }),
      ...(validatedData.updateExisting !== undefined && {
        updateExisting: validatedData.updateExisting,
      }),
      ...(validatedData.totalRows !== undefined && {
        totalRows: validatedData.totalRows,
      }),
    },
  });

  const readiness = checkImportReadiness(updatedImport);

  if (readiness.ready) {
    await queue("contact-imports").push("process-import", {
      contactImportId,
    });
  }

  const response: UpdateContactImportResponse = {
    id: updatedImport.id,
    status: readiness.ready ? "QUEUED" : updatedImport.status,
    ready: readiness.ready,
    missing: readiness.missing,
    updatedAt: updatedImport.updatedAt.toISOString(),
  };

  return responseOk(response);
}
