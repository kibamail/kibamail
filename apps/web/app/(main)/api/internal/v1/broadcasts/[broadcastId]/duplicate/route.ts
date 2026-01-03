/**
 * Duplicate Broadcast Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/broadcasts/[broadcastId]/duplicate
 *
 * Supported Methods:
 * - POST    Duplicate a broadcast
 *
 * Creates a copy of the broadcast with all its settings and email content.
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { responseCreated, responseNotFound } from "@/lib/api/responses";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

/**
 * POST /api/internal/v1/broadcasts/[broadcastId]/duplicate
 *
 * Duplicate a broadcast by ID
 * Creates a new broadcast with the same settings and email content
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      // Fetch the original broadcast with its email content
      const original = await prisma.broadcast.findFirst({
        where: {
          id: broadcastId,
          workspaceId,
        },
        include: {
          emailContent: true,
        },
      });

      if (!original) {
        return responseNotFound("Broadcast not found");
      }

      // Use a transaction to create the broadcast and email content
      const duplicate = await prisma.$transaction(async (tx) => {
        // Create email content first if it exists
        let emailContentId: string | null = null;
        if (original.emailContent) {
          const newEmailContent = await tx.emailContent.create({
            data: {
              subject: original.emailContent.subject,
              contentJson: original.emailContent.contentJson ?? undefined,
              contentHtml: original.emailContent.contentHtml,
              contentText: original.emailContent.contentText,
              styles: original.emailContent.styles ?? undefined,
              previewText: original.emailContent.previewText,
            },
          });
          emailContentId = newEmailContent.id;
        }

        // Create the duplicate broadcast
        const newBroadcast = await tx.broadcast.create({
          data: {
            workspaceId,
            name: `Copy of ${original.name}`,
            status: "DRAFT",
            senderIdentityId: original.senderIdentityId,
            sendingDomainId: original.sendingDomainId,
            topicId: original.topicId,
            segmentId: original.segmentId,
            emailContentId,
          },
        });

        return newBroadcast;
      });

      return responseCreated({ id: duplicate.id }, "broadcast");
    }),
  );
}
