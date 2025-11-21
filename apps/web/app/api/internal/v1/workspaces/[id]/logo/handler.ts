/**
 * Update Organization Logo - Handler
 *
 * Business logic for /api/internal/v1/workspaces/:id/logo endpoint
 */

import { BadRequestError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { uploadPublicFile } from "@/lib/storage/garage-s3-client";

// Supported image MIME types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * PATCH /api/internal/v1/workspaces/:id/logo
 *
 * Upload and update organization logo
 */
export async function updateOrganizationLogo(
  _session: UserSession,
  workspaceId: string,
  request: Request,
) {
  const formData = await request.formData();
  const file = formData.get("logo") as File | null;

  if (!file) {
    throw new BadRequestError("No logo file provided");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    throw new BadRequestError(
      `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File size exceeds maximum allowed size of ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB`,
    );
  }

  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "png";
  const key = `organizations/${workspaceId}/logo-${timestamp}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadResult = await uploadPublicFile(key, buffer, file.type);

  return responseOk({
    success: true,
    logoUrl: uploadResult.publicUrl,
  });
}
