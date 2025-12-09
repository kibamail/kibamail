/**
 * Automation Publish Route (External API)
 *
 * POST /api/v1/automations/[automationId]/publish - Publish a DRAFT automation
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { publishAutomation } from "../../handler";

/**
 * POST /api/v1/automations/[automationId]/publish
 *
 * Publish a DRAFT automation
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
      (apiKey) => publishAutomation(apiKey.workspaceId, automationId),
      ["write:automations"]
    );
  });
}
