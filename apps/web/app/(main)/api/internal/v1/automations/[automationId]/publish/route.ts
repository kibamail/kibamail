/**
 * Automation Publish Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/automations/[automationId]/publish
 *
 * Supported Methods:
 * - POST   Publish a DRAFT automation
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { publishAutomation } from "@/app/(main)/api/v1/automations/handler";

/**
 * POST /api/internal/v1/automations/[automationId]/publish
 *
 * Publish a DRAFT automation
 * Requires: manage:automations permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  const { automationId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return publishAutomation(session.currentOrganization.id, automationId);
      },
      ["manage:automations"]
    )
  );
}
