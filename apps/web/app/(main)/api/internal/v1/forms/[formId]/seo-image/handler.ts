/**
 * Form SEO Image Handler (Internal API)
 *
 * Handles upload and deletion of form SEO (Open Graph) images.
 */

import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { uploadPublicFile } from "@/lib/storage";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * POST /api/internal/v1/forms/:formId/seo-image
 *
 * Upload SEO image for a form
 */
export async function uploadSeoImage(
  session: UserSession,
  formId: string,
  request: Request,
) {
  const workspaceId = session.currentOrganization?.id;
  if (!workspaceId) {
    throw new Error("No active workspace found");
  }

  // Verify form exists and belongs to this workspace
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    throw new BadRequestError("No image file provided");
  }

  if (!ALLOWED_IMAGE_TYPES.some((type) => type === file.type)) {
    throw new BadRequestError(
      `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "png";
  const key = `forms/${formId}/og-image-${timestamp}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadResult = await uploadPublicFile(key, buffer, file.type);

  // Update form with new SEO image URL
  await prisma.form.update({
    where: { id: formId },
    data: { seoImageUrl: uploadResult.publicUrl },
  });

  return responseOk({
    url: uploadResult.publicUrl,
  });
}

/**
 * DELETE /api/internal/v1/forms/:formId/seo-image
 *
 * Remove SEO image from a form
 */
export async function deleteSeoImage(session: UserSession, formId: string) {
  const workspaceId = session.currentOrganization?.id;
  if (!workspaceId) {
    throw new Error("No active workspace found");
  }

  // Verify form exists and belongs to this workspace
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  // Clear the SEO image URL
  await prisma.form.update({
    where: { id: formId },
    data: { seoImageUrl: null },
  });

  return responseOk({
    success: true,
  });
}
