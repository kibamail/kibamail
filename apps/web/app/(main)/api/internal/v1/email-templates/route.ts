/**
 * Email Templates Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/email-templates
 *
 * Supported Methods:
 * - GET    List all email templates
 * - POST   Create a new email template
 */

import type { NextRequest } from "next/server";
import { createEmailTemplate, listEmailTemplates } from "./handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * GET /api/internal/v1/email-templates
 *
 * List all email templates with cursor-based pagination.
 * Requires: read:templates permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return listEmailTemplates(session.currentOrganization.id, request);
      },
      ["read:templates"],
    ),
  );
}

/**
 * POST /api/internal/v1/email-templates
 *
 * Create a new email template.
 * Requires: manage:templates permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return createEmailTemplate(session.currentOrganization.id, request);
      },
      ["manage:templates"],
    ),
  );
}
