/**
 * Email Template Publish Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/email-templates/[templateId]/publish
 *
 * Supported Methods:
 * - POST    Publish an email template
 */

import { type NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { publishEmailTemplate } from "../../handler";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

/**
 * POST /api/internal/v1/email-templates/[templateId]/publish
 *
 * Publish an email template.
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
        return publishEmailTemplate(session.currentOrganization.id, templateId);
      },
      ["manage:templates"],
    ),
  );
}
