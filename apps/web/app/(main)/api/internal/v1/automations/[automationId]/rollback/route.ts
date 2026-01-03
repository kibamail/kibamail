/**
 * Automation Rollback Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/automations/[automationId]/rollback
 *
 * Supported Methods:
 * - POST   Rollback to an archived version of an automation
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { rollbackAutomation } from "@/app/(main)/api/v1/automations/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * POST /api/internal/v1/automations/[automationId]/rollback
 *
 * Rollback to an archived version of an automation
 * Requires: manage:automations permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> },
) {
  const { automationId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return rollbackAutomation(session.currentOrganization.id, automationId);
      },
      ["manage:automations"],
    ),
  );
}
