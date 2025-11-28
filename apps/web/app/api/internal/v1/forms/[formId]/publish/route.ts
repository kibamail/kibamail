/**
 * Form Publish Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/forms/[formId]/publish
 *
 * Supported Methods:
 * - POST   Publish a form
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { publishForm } from "@/app/api/v1/forms/handler";

/**
 * POST /api/internal/v1/forms/[formId]/publish
 *
 * Publish a form
 * - For root forms: Sets status to PUBLISHED and publishedVersionId to self
 * - For versions: Archives old published version, publishes new, updates root
 * Requires: manage:forms permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return publishForm(session.currentOrganization.id, formId);
      },
      ["manage:forms"]
    )
  );
}
