/**
 * Form Versions Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/forms/[formId]/versions
 *
 * Supported Methods:
 * - POST Create new form version (draft)
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { createFormVersion } from "@/app/(main)/api/v1/forms/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * POST /api/internal/v1/forms/[formId]/versions
 *
 * Create a new version (draft) of a form
 * Requires: manage:forms permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return createFormVersion(
          session.currentOrganization.id,
          formId,
          request,
        );
      },
      ["manage:forms"],
    ),
  );
}
