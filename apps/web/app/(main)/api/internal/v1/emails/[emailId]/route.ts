/**
 * Individual Email Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/emails/[emailId]
 *
 * Supported Methods:
 * - GET     Get email details
 * - PUT     Update email
 * - DELETE  Delete email
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getEmail, updateEmail, deleteEmail } from "@/app/(main)/api/internal/v1/emails/handler";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

/**
 * GET /api/internal/v1/emails/[emailId]
 *
 * Get a specific email by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getEmail(session.currentOrganization.id, emailId);
      },
      ["read:forms"]
    )
  );
}

/**
 * PUT /api/internal/v1/emails/[emailId]
 *
 * Update a specific email by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateEmail(session.currentOrganization.id, emailId, request);
      },
      ["manage:forms"]
    )
  );
}

/**
 * DELETE /api/internal/v1/emails/[emailId]
 *
 * Delete a specific email by ID
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteEmail(session.currentOrganization.id, emailId);
      },
      ["manage:forms"]
    )
  );
}
