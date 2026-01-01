/**
 * Broadcast File Upload - Handler
 *
 * Business logic for /api/internal/v1/broadcasts/:broadcastId/files endpoint
 */

import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { uploadPublicFile } from "@/lib/storage";

// Supported file MIME types for broadcast uploads
const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents (for attachments)
  "application/pdf",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES_PER_REQUEST = 10;

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

/**
 * POST /api/internal/v1/broadcasts/:broadcastId/files
 *
 * Upload files for a broadcast (images, attachments, etc.)
 */
export async function uploadBroadcastFiles(
  session: UserSession,
  broadcastId: string,
  request: Request,
) {
  // Verify the broadcast exists and belongs to the user's workspace
  const broadcast = await prisma.broadcast.findFirst({
    where: {
      id: broadcastId,
      workspaceId: session.currentOrganization.id,
    },
    select: { id: true },
  });

  if (!broadcast) {
    throw new NotFoundError("Broadcast not found");
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    throw new BadRequestError("No files provided");
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    throw new BadRequestError(
      `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request`,
    );
  }

  const uploadedFiles: UploadedFile[] = [];

  for (const file of files) {
    if (!(file instanceof File)) {
      continue;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      throw new BadRequestError(
        `Invalid file type "${file.type}" for file "${file.name}". Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError(
        `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `broadcasts/${broadcastId}/${timestamp}-${sanitizedFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadPublicFile(key, buffer, file.type);

    uploadedFiles.push({
      name: file.name,
      url: uploadResult.publicUrl,
      size: file.size,
      type: file.type,
    });
  }

  return responseOk({
    files: uploadedFiles,
  });
}
