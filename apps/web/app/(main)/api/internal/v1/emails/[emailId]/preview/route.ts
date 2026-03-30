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
          throw new NotFoundError(
            "Email not found",
            ErrorCode.RESOURCE_NOT_FOUND,
          );
        }

        // Sample variables for preview
        const sampleVariables: Record<string, string> = {
          email: "preview@example.com",
          "contact.email": "preview@example.com",
          firstName: "John",
          first_name: "John",
          "contact.first_name": "John",
          lastName: "Doe",
          last_name: "Doe",
          "contact.last_name": "Doe",
          phone: "+1 555 0100",
          country: "United States",
          timezone: "America/New_York",
          city: "New York",
          confirmation_url: "#confirm-subscription",
          unsubscribe_url: "#unsubscribe",
          preferences_url: "#preferences",
        };

        // Raw HTML path — substitute variables directly
        if (email.htmlContent) {
          const html = email.htmlContent.replace(
            /\{\{(\w+(?:\.\w+)*)\}\}/g,
            (match, varName) => sampleVariables[varName] ?? match,
          );

          return NextResponse.json(
            { html, hasContent: true },
            { status: 200 },
          );
        }

        // TipTap JSON path — render via broadcast renderer
        const contentJson = email.content;
        if (!contentJson) {
          return NextResponse.json(
            {
              html: "<html><body><p>No content to preview</p></body></html>",
              hasContent: false,
            },
            { status: 200 },
          );
        }

        const storedStyles = (email.styles as BroadcastStyles) || {};

        const html = await renderBroadcastToHtml(
          contentJson as unknown as BroadcastDocument,
          { variables: sampleVariables },
          storedStyles,
        );

        return NextResponse.json(
          { html, hasContent: true },
          { status: 200 },
        );
      },
      ["read:forms"],
    ),
  );
}
