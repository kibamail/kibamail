/**
 * Transactional Emails Route (External API)
 *
 * GET    /api/v1/emails - List transactional emails (paginated)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { listTransactionalEmails } from "./handler";

/**
 * GET /api/v1/emails
 *
 * List transactional emails with pagination, filtering, and search
 * Requires API key authentication with smtp:send scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listTransactionalEmails(apiKey.workspaceId, request),
      ["smtp:send"],
    ),
  );
}
