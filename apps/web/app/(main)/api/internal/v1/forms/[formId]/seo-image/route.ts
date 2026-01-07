/**
 * Form SEO Image Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/forms/[formId]/seo-image
 *
 * Supported Methods:
 * - POST   Upload SEO image
 * - DELETE Remove SEO image
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { deleteSeoImage, uploadSeoImage } from "./handler";

/**
 * POST /api/internal/v1/forms/[formId]/seo-image
 *
 * Upload SEO (Open Graph) image for a form
 * Accepts multipart/form-data with an "image" field
 *
 * Requires: manage:forms permission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => uploadSeoImage(session, formId, request),
      ["manage:forms"],
    ),
  );
}

/**
 * DELETE /api/internal/v1/forms/[formId]/seo-image
 *
 * Remove SEO image from a form
 *
 * Requires: manage:forms permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => deleteSeoImage(session, formId),
      ["manage:forms"],
    ),
  );
}
