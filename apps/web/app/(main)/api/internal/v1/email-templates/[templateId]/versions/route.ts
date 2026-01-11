/**
 * Email Template Versions Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/email-templates/[templateId]/versions
 *
 * Supported Methods:
 * - GET     List all versions of an email template
 * - POST    Create a new version of an email template
 */

import { type NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  createEmailTemplateVersion,
  listEmailTemplateVersions,
} from "../../handler";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

/**
 * GET /api/internal/v1/email-templates/[templateId]/versions
 *
 * List all versions of an email template.
 * Uses session-based authentication and requires read:templates permission.
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
        return listEmailTemplateVersions(
          session.currentOrganization.id,
          templateId,
        );
      },
      ["read:templates"],
    ),
  );
}

/**
 * POST /api/internal/v1/email-templates/[templateId]/versions
 *
 * Create a new version of an email template.
 * Uses session-based authentication and requires manage:templates permission.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return createEmailTemplateVersion(
          session.currentOrganization.id,
          templateId,
        );
      },
      ["manage:templates"],
    ),
  );
}
