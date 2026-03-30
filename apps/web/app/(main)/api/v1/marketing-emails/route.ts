/**
 * Marketing Emails Collection Route (External API)
 *
 * GET    /api/v1/marketing-emails - List marketing emails
 * POST   /api/v1/marketing-emails - Create a new marketing email
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { createMarketingEmail, listMarketingEmails } from "./handler";

export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listMarketingEmails(apiKey.workspaceId, request),
      ["read:emails"],
    ),
  );
}

export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createMarketingEmail(apiKey.workspaceId, request),
      ["write:emails"],
    ),
  );
}
