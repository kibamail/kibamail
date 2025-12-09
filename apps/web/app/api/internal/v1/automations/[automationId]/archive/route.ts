/**
 * Automation Archive Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/automations/[automationId]/archive
 *
 * Supported Methods:
 * - POST   Archive a PUBLISHED automation
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { archiveAutomation } from "@/app/api/v1/automations/handler";

/**
 * POST /api/internal/v1/automations/[automationId]/archive
 *
 * Archive a PUBLISHED automation
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
        return archiveAutomation(session.currentOrganization.id, automationId);
      },
      ["manage:automations"]
    )
  );
}
