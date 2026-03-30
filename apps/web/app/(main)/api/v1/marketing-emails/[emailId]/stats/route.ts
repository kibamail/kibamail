/**
 * Marketing Email Stats Route (External API)
 *
 * GET /api/v1/marketing-emails/[emailId]/stats
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { getMarketingEmailStats } from "../../handler";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getMarketingEmailStats(apiKey.workspaceId, emailId),
      ["read:emails"],
    ),
  );
}
