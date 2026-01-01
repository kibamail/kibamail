/**
 * Automation Versions Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/automations/[automationId]/versions
 *
 * Supported Methods:
 * - GET    List all versions of an automation
 * - POST   Create a new version of an automation
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  listAutomationVersions,
  createAutomationVersion,
} from "@/app/(main)/api/v1/automations/handler";

/**
 * GET /api/internal/v1/automations/[automationId]/versions
 *
 * List all versions of an automation
 * Requires: read:automations permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(
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
        return listAutomationVersions(
          session.currentOrganization.id,
          automationId
        );
      },
      ["read:automations"]
    )
  );
}

/**
 * POST /api/internal/v1/automations/[automationId]/versions
 *
 * Create a new version of an automation
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
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return createAutomationVersion(
          session.currentOrganization.id,
          automationId,
          request
        );
      },
      ["manage:automations"]
    )
  );
}
