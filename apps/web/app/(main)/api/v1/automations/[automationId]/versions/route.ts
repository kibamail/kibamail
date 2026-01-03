/**
 * Automation Versions Route (External API)
 *
 * GET  /api/v1/automations/[automationId]/versions - List all versions
 * POST /api/v1/automations/[automationId]/versions - Create new version
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { listAutomationVersions, createAutomationVersion } from "@/app/(main)/api/v1/automations/handler";

/**
 * GET /api/v1/automations/[automationId]/versions
 *
 * List all versions of an automation
 * Requires API key authentication with read:automations scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey) => listAutomationVersions(apiKey.workspaceId, automationId),
      ["read:automations"]
    );
  });
}

/**
 * POST /api/v1/automations/[automationId]/versions
 *
 * Create a new version of an automation
 * Requires API key authentication with write:automations scope
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey, request) =>
        createAutomationVersion(apiKey.workspaceId, automationId, request),
      ["write:automations"]
    );
  });
}
