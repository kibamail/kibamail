/**
 * Email Template Preview Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/email-templates/[templateId]/preview
 *
 * Supported Methods:
 * - GET    Get the HTML preview of an email template
 *
 * Returns the rendered HTML exactly as it will appear in an email
 */

import { type NextRequest, NextResponse } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  type BroadcastDocument,
  type BroadcastStyles,
  renderBroadcastToHtml,
} from "@/lib/broadcast-renderer";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

/**
 * GET /api/internal/v1/email-templates/[templateId]/preview
 *
 * Get the HTML preview of an email template
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      // Fetch the template with email content
      const template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
          workspaceId,
        },
        include: {
          emailContent: true,
        },
      });

      if (!template) {
        throw new NotFoundError(
          "Email template not found",
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }

      // Check if there's content to render
      const contentJson = template.emailContent?.contentJson;
      if (!contentJson) {
        return NextResponse.json(
          {
            html: "<html><body><p>No content to preview</p></body></html>",
            hasContent: false,
          },
          { status: 200 },
        );
      }

      // Get styles from the email content (if stored)
      const storedStyles =
        (template.emailContent?.styles as BroadcastStyles) || {};

      // Render the template to HTML with styles
      const html = await renderBroadcastToHtml(
        contentJson as unknown as BroadcastDocument,
        {
          // Provide sample variables for preview
          variables: {
            "contact.email": "preview@example.com",
            "contact.first_name": "John",
            "contact.last_name": "Doe",
            unsubscribe_url: "#unsubscribe",
          },
        },
        storedStyles,
      );

      return NextResponse.json(
        {
          html,
          hasContent: true,
        },
        { status: 200 },
      );
    }),
  );
}
