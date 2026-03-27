/**
 * Form Deploy Route (External API)
 *
 * POST /api/v1/forms/[formId]/deploy - Deploy a site bundle to a form
 *
 * Authentication: API Key (Bearer token)
 * Accepts multipart/form-data with a "files" field containing the site bundle
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { deployForm } from "./handler";

/**
 * POST /api/v1/forms/[formId]/deploy
 *
 * Upload a site bundle (one index.html + CSS, JS, images, fonts, etc.)
 * Requires API key authentication with write:forms scope
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deployForm(apiKey.workspaceId, formId, request),
      ["write:forms"],
    ),
  );
}
