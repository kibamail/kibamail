/**
 * Individual Email Template Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/email-templates/[templateId]
 *
 * Supported Methods:
 * - GET     Get email template details
 * - PUT     Update email template
 * - DELETE  Delete email template
 */

import type { NextRequest } from "next/server";
import {
  deleteEmailTemplate,
  getEmailTemplate,
  updateEmailTemplate,
} from "../handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

/**
 * GET /api/internal/v1/email-templates/[templateId]
 *
 * Get a specific email template by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getEmailTemplate(session.currentOrganization.id, templateId);
      },
      ["read:templates"],
    ),
  );
}

/**
 * PUT /api/internal/v1/email-templates/[templateId]
 *
 * Update a specific email template by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateEmailTemplate(
          session.currentOrganization.id,
          templateId,
          request,
        );
      },
      ["manage:templates"],
    ),
  );
}

/**
 * DELETE /api/internal/v1/email-templates/[templateId]
 *
 * Delete a specific email template by ID
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteEmailTemplate(session.currentOrganization.id, templateId);
      },
      ["manage:templates"],
    ),
  );
}
