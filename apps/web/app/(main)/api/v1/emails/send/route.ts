/**
 * Transactional Email Send Route (External API)
 *
 * POST /api/v1/emails/send - Send transactional email
 *
 * Authentication: API Key (Bearer token) with smtp:send scope
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { sendTransactionalEmail } from "./handler";

/**
 * POST /api/v1/emails/send
 *
 * Send a transactional email to one or more recipients.
 * The sender email must belong to a verified sending domain in the workspace.
 * If the sender identity does not exist, it will be automatically created.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => sendTransactionalEmail(apiKey.workspaceId, request),
      ["smtp:send"],
    ),
  );
}
