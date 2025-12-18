/**
 * Contact Imports - Handler
 *
 * Business logic for /api/internal/v1/contact-imports endpoint
 */

import { BadRequestError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage/s3-client";
import type { CreateContactImportResponse } from "./schema";

const ALLOWED_FILE_TYPES = ["text/csv", "application/csv"] as const;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

/**
 * POST /api/internal/v1/contact-imports
 *
 * Create a new contact import by uploading a CSV file.
 * The file is uploaded to S3 and a database record is created.
 */
export async function createContactImport(
  session: UserSession,
  request: Request,
) {
  const workspaceId = session.currentOrganization.id;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new BadRequestError("No file provided");
  }

  if (!(file instanceof File)) {
    throw new BadRequestError("Invalid file");
  }

  const isValidType =
    ALLOWED_FILE_TYPES.includes(
      file.type as (typeof ALLOWED_FILE_TYPES)[number],
    ) || file.name.toLowerCase().endsWith(".csv");

  if (!isValidType) {
    throw new BadRequestError(
      `Invalid file type "${file.type}" for file "${file.name}". Only CSV files are allowed.`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `contact-imports/${workspaceId}/${timestamp}-${sanitizedFileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await uploadFile(key, buffer, "text/csv");

  const contactImport = await prisma.contactImport.create({
    data: {
      workspaceId,
      fileKey: key,
      fileName: file.name,
      fileSize: file.size,
      columnMapping: {}, // Will be set in PATCH
    },
  });

  const response: CreateContactImportResponse = {
    id: contactImport.id,
    fileKey: contactImport.fileKey,
    fileName: contactImport.fileName,
    fileSize: contactImport.fileSize,
    status: contactImport.status,
    createdAt: contactImport.createdAt.toISOString(),
  };

  return responseOk(response);
}
