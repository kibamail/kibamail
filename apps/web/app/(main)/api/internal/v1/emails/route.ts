/**
 * Emails Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/emails
 *
 * Supported Methods:
 * - POST   Create a new email
 * - GET    List all emails for workspace
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createEmail, listEmails } from "./handler";

/**
 * POST /api/internal/v1/emails
 *
 * Create a new email
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return createEmail(session.currentOrganization.id, request);
      },
      ["manage:forms"]
    )
  );
}

/**
 * GET /api/internal/v1/emails
 *
 * List all emails for workspace
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return listEmails(session.currentOrganization.id, request);
      },
      ["read:forms"]
    )
  );
}
