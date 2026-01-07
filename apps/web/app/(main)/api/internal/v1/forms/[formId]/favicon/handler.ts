/**
 * Form Favicon Handler (Internal API)
 *
 * Handles upload and deletion of form favicons.
 */

import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { uploadPublicFile } from "@/lib/storage";

const ALLOWED_FAVICON_TYPES = [
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/png",
  "image/svg+xml",
] as const;

const MAX_FILE_SIZE = 500 * 1024; // 500KB

/**
 * POST /api/internal/v1/forms/:formId/favicon
 *
 * Upload favicon for a form
 */
export async function uploadFavicon(
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
    throw new BadRequestError("No favicon file provided");
  }

  if (!ALLOWED_FAVICON_TYPES.some((type) => type === file.type)) {
    throw new BadRequestError(
      `Invalid file type. Allowed types: ico, png, svg`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024}KB`,
    );
  }

  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "ico";
  const key = `forms/${formId}/favicon-${timestamp}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadResult = await uploadPublicFile(key, buffer, file.type);

  // Update form with new favicon URL
  await prisma.form.update({
    where: { id: formId },
    data: { seoFaviconUrl: uploadResult.publicUrl },
  });

  return responseOk({
    url: uploadResult.publicUrl,
  });
}

/**
 * DELETE /api/internal/v1/forms/:formId/favicon
 *
 * Remove favicon from a form
 */
export async function deleteFavicon(session: UserSession, formId: string) {
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

  // Clear the favicon URL
  await prisma.form.update({
    where: { id: formId },
    data: { seoFaviconUrl: null },
  });

  return responseOk({
    success: true,
  });
}
