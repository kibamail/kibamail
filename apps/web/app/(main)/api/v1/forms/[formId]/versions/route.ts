/**
 * Form Versions Route (External API)
 *
 * GET  /api/v1/forms/[formId]/versions - List all versions of a form
 * POST /api/v1/forms/[formId]/versions - Create new version
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import {
  createFormVersion,
  listFormVersions,
} from "@/app/(main)/api/v1/forms/handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

/**
 * GET /api/v1/forms/[formId]/versions
 *
 * List all versions of a form (root form and all child versions)
 * Requires API key authentication with read:forms scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => listFormVersions(apiKey.workspaceId, formId),
      ["read:forms"],
    ),
  );
}

/**
 * POST /api/v1/forms/[formId]/versions
 *
 * Create a new version of a form
 * All fields are optional - if not provided, derived from parent form
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
      (apiKey, request) =>
        createFormVersion(apiKey.workspaceId, formId, request),
      ["write:forms"],
    ),
  );
}
