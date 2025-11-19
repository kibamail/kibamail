/**
 * Form Publish Route (External API)
 *
 * POST /api/v1/forms/[formId]/publish - Publish a form
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { publishForm } from "../../handler";

/**
 * POST /api/v1/forms/[formId]/publish
 *
 * Publish a form
 * - For root forms: Sets status to PUBLISHED and publishedVersionId to self
 * - For versions: Archives old published version, publishes new, updates root
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
      (apiKey) => publishForm(apiKey.workspaceId, formId),
      ["write:forms"]
    )
  );
}
