/**
 * Form Submissions Route (External API)
 *
 * POST /api/v1/forms/[formId]/submissions - Submit data to a form
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { createFormSubmission } from "@/app/api/v1/forms/submissions-handler";

/**
 * POST /api/v1/forms/[formId]/submissions
 *
 * Submit data to a form
 * - For SIGN_UP forms: Creates or updates a contact
 * - For SURVEY forms: Creates a form submission record
 *
 * Requires API key authentication with write:forms scope
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        createFormSubmission(apiKey.workspaceId, formId, request),
      ["write:forms"]
    )
  );
}
