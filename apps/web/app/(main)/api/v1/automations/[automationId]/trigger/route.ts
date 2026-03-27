/**
 * Automation Trigger Route (External API)
 *
 * POST /api/v1/automations/[automationId]/trigger - Trigger an API-type automation for a contact
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { triggerAutomation } from "./handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> },
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey) => triggerAutomation(apiKey.workspaceId, automationId, request),
      ["write:automations"],
    );
  });
}
