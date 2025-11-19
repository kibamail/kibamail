/**
 * Form Versions Route (External API)
 *
 * POST /api/v1/forms/[formId]/versions - Create new version
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { createFormVersion } from "../../handler";

/**
 * POST /api/v1/forms/[formId]/versions
 *
 * Create a new version of a form
 * All fields are optional - if not provided, derived from parent form
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
      (apiKey, request) => createFormVersion(apiKey.workspaceId, formId, request),
      ["write:forms"]
    )
  );
}
