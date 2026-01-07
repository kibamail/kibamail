/**
 * Form Favicon Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/forms/[formId]/favicon
 *
 * Supported Methods:
 * - POST   Upload favicon
 * - DELETE Remove favicon
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { deleteFavicon, uploadFavicon } from "./handler";

/**
 * POST /api/internal/v1/forms/[formId]/favicon
 *
 * Upload favicon for a form
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
      (session) => uploadFavicon(session, formId, request),
      ["manage:forms"],
    ),
  );
}

/**
 * DELETE /api/internal/v1/forms/[formId]/favicon
 *
 * Remove favicon from a form
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
      (session) => deleteFavicon(session, formId),
      ["manage:forms"],
    ),
  );
}
