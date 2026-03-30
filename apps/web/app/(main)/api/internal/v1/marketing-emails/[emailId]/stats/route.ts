/**
 * Marketing Email Stats Endpoint (Internal API)
 *
 * GET /api/internal/v1/marketing-emails/[emailId]/stats
 *
 * Session-based authentication for frontend use.
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getMarketingEmailStats } from "@/app/(main)/api/v1/marketing-emails/handler";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getMarketingEmailStats(session.currentOrganization.id, emailId);
      },
      ["read:forms"],
    ),
  );
}
