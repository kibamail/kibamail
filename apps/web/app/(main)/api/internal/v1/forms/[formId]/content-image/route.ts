/**
 * Form Content Image Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/forms/[formId]/content-image
 *
 * Supported Methods:
 * - POST   Upload content image for use in form content blocks or success messages
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { uploadContentImage } from "./handler";

/**
 * POST /api/internal/v1/forms/[formId]/content-image
 *
 * Upload a content image for use in form content blocks or success messages
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
      (session) => uploadContentImage(session, formId, request),
      ["manage:forms"],
    ),
  );
}
