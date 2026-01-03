/**
 * Automation Archive Route (External API)
 *
 * POST /api/v1/automations/[automationId]/archive - Archive a PUBLISHED automation
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { archiveAutomation } from "@/app/(main)/api/v1/automations/handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

/**
 * POST /api/v1/automations/[automationId]/archive
 *
 * Archive a PUBLISHED automation
 * Requires API key authentication with write:automations scope
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> },
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey) => archiveAutomation(apiKey.workspaceId, automationId),
      ["write:automations"],
    );
  });
}
