/**
 * Transactional Email Detail Route (External API)
 *
 * GET    /api/v1/emails/[emailId] - Get transactional email detail
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { getTransactionalEmail } from "../handler";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

/**
 * GET /api/v1/emails/[emailId]
 *
 * Get full details for a specific transactional email
 * Requires API key authentication with smtp:send scope
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getTransactionalEmail(apiKey.workspaceId, emailId),
      ["smtp:send"],
    ),
  );
}
