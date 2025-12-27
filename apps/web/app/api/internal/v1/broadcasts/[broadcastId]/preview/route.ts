/**
 * Broadcast Preview Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/broadcasts/[broadcastId]/preview
 *
 * Supported Methods:
 * - GET    Get the HTML preview of a broadcast
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
  params: Promise<{ broadcastId: string }>;
}

/**
 * GET /api/internal/v1/broadcasts/[broadcastId]/preview
 *
 * Get the HTML preview of a broadcast
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      // Fetch the broadcast with email content
      const broadcast = await prisma.broadcast.findFirst({
        where: {
          id: broadcastId,
          workspaceId,
        },
        include: {
          emailContent: true,
        },
      });

      if (!broadcast) {
        throw new NotFoundError(
          "Broadcast not found",
          ErrorCode.BROADCAST_NOT_FOUND
        );
      }

      // Check if there's content to render
      const contentJson = broadcast.emailContent?.contentJson;
      if (!contentJson) {
        return NextResponse.json(
          {
            html: "<html><body><p>No content to preview</p></body></html>",
            hasContent: false,
          },
          { status: 200 }
        );
      }

      // Get styles from the email content (if stored)
      const storedStyles = (broadcast.emailContent?.styles as BroadcastStyles) || {};

      // Render the broadcast to HTML with styles
      const html = await renderBroadcastToHtml(
        contentJson as unknown as BroadcastDocument,
        {
          // Provide sample variables for preview
          variables: {
            "contact.email": "preview@example.com",
            "contact.first_name": "John",
            "contact.last_name": "Doe",
            unsubscribe_url: "#unsubscribe",
            preferences_url: "#preferences",
            view_in_browser_url: "#view-in-browser",
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
    })
  );
}
