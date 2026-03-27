/**
 * Form Deploy Endpoint (Internal API)
 *
 * POST /api/internal/v1/forms/[formId]/deploy - Deploy a site bundle
 *
 * Authentication: Session (dashboard user)
 * Requires: manage:forms permission
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { deployForm } from "@/app/(main)/api/v1/forms/[formId]/deploy/handler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        const workspaceId = session.currentOrganization?.id;
        if (!workspaceId) throw new Error("No active workspace found");
        return deployForm(workspaceId, formId, request);
      },
      ["manage:forms"],
    ),
  );
}
