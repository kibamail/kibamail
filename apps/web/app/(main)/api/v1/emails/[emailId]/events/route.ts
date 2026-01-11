/**
 * Transactional Email Events Route (External API)
 *
 * GET    /api/v1/emails/[emailId]/events - Get email events (timeline)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { getTransactionalEmailEvents } from "../../handler";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

/**
 * GET /api/v1/emails/[emailId]/events
 *
 * Get all events for a specific transactional email (timeline)
 * Events are ordered chronologically (oldest first)
 * Requires API key authentication with smtp:send scope
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getTransactionalEmailEvents(apiKey.workspaceId, emailId),
      ["smtp:send"],
    ),
  );
}
