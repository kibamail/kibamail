/**
 * Email Preview Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/emails/[emailId]/preview
 *
 * Supported Methods:
 * - GET    Get the HTML preview of an email
 *
 * Returns the rendered HTML exactly as it will appear in an email
 */

import { NextResponse, type NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import {
  renderBroadcastToHtml,
  type BroadcastDocument,
  type BroadcastStyles,
} from "@/lib/broadcast-renderer";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

/**
 * GET /api/internal/v1/emails/[emailId]/preview
 *
 * Get the HTML preview of an email
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      async (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }

        const workspaceId = session.currentOrganization.id;

        // Fetch the email
        const email = await prisma.email.findFirst({
          where: {
            id: emailId,
            workspaceId,
          },
        });

        if (!email) {
          throw new NotFoundError("Email not found", ErrorCode.RESOURCE_NOT_FOUND);
        }

        // Check if there's content to render
        const contentJson = email.content;
        if (!contentJson) {
          return NextResponse.json(
            {
              html: "<html><body><p>No content to preview</p></body></html>",
              hasContent: false,
            },
            { status: 200 }
          );
        }

        // Get styles from the email (if stored)
        const storedStyles = (email.styles as BroadcastStyles) || {};

        // Render the email to HTML with styles
        const html = await renderBroadcastToHtml(
          contentJson as unknown as BroadcastDocument,
          {
            // Provide sample variables for preview
            variables: {
              "contact.email": "preview@example.com",
              "contact.first_name": "John",
              "contact.last_name": "Doe",
              confirmation_url: "#confirm-subscription",
            },
          },
          storedStyles
        );

        return NextResponse.json(
          {
            html,
            hasContent: true,
          },
          { status: 200 }
        );
      },
      ["read:forms"]
    )
  );
}
