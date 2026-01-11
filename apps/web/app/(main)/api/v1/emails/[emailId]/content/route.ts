/**
 * Transactional Email Content Route (External API)
 *
 * GET    /api/v1/emails/[emailId]/content - Get email HTML/text content
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { getTransactionalEmailContent } from "../../handler";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

/**
 * GET /api/v1/emails/[emailId]/content
 *
 * Get the email content (HTML and text) from S3 storage
 * Requires API key authentication with smtp:send scope
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getTransactionalEmailContent(apiKey.workspaceId, emailId),
      ["smtp:send"],
    ),
  );
}
