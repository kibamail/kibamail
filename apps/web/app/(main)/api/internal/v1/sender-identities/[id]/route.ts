/**
 * Sender Identity Resource Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/sender-identities/[id]
 *
 * Supported Methods:
 * - GET    Get a single sender identity
 * - PUT    Update a sender identity
 * - DELETE Delete a sender identity
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  responseBadRequest,
  responseNotFound,
  responseOk,
} from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import { updateSenderIdentitySchema } from "../schema";

/**
 * Format sender identity for API response
 */
function formatSenderIdentity(senderIdentity: {
  id: string;
  name: string;
  email: string;
  replyToEmail: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  sendingDomain: { id: string; name: string };
}) {
  return {
    id: senderIdentity.id,
    name: senderIdentity.name,
    email: `${senderIdentity.email}@${senderIdentity.sendingDomain.name}`,
    localPart: senderIdentity.email,
    domain: senderIdentity.sendingDomain.name,
    domainId: senderIdentity.sendingDomain.id,
    replyToEmail: senderIdentity.replyToEmail,
    verified: senderIdentity.emailVerifiedAt !== null,
    createdAt: senderIdentity.createdAt.toISOString(),
  };
}

/**
 * GET /api/internal/v1/sender-identities/[id]
 *
 * Get a single sender identity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const senderIdentity = await prisma.senderIdentity.findFirst({
        where: {
          id,
          workspaceId: session.currentOrganization.id,
        },
        include: {
          sendingDomain: {
            select: { id: true, name: true },
          },
        },
      });

      if (!senderIdentity) {
        return responseNotFound("Sender identity not found");
      }

      return responseOk(formatSenderIdentity(senderIdentity), "sender_identity");
    }),
  );
}

/**
 * PUT /api/internal/v1/sender-identities/[id]
 *
 * Update a sender identity (name and reply-to only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;
      const body = await request.json();

      // Validate request body
      const parsed = updateSenderIdentitySchema.safeParse(body);
      if (!parsed.success) {
        return responseBadRequest(
          parsed.error.issues[0]?.message || "Invalid request body",
        );
      }

      // Verify the sender identity exists and belongs to workspace
      const existingIdentity = await prisma.senderIdentity.findFirst({
        where: {
          id,
          workspaceId,
        },
        include: {
          sendingDomain: {
            select: { id: true, name: true },
          },
        },
      });

      if (!existingIdentity) {
        return responseNotFound("Sender identity not found");
      }

      // Build update data
      const updateData: { name?: string; replyToEmail?: string | null } = {};
      if (parsed.data.name !== undefined) {
        updateData.name = parsed.data.name;
      }
      if (parsed.data.replyToEmail !== undefined) {
        updateData.replyToEmail = parsed.data.replyToEmail;
      }

      // Update the sender identity
      const updatedIdentity = await prisma.senderIdentity.update({
        where: { id },
        data: updateData,
        include: {
          sendingDomain: {
            select: { id: true, name: true },
          },
        },
      });

      return responseOk(formatSenderIdentity(updatedIdentity), "sender_identity");
    }),
  );
}

/**
 * DELETE /api/internal/v1/sender-identities/[id]
 *
 * Delete a sender identity
 * Blocked if the sender identity is used by any broadcast
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      // Verify the sender identity exists and belongs to workspace
      const senderIdentity = await prisma.senderIdentity.findFirst({
        where: {
          id,
          workspaceId,
        },
      });

      if (!senderIdentity) {
        return responseNotFound("Sender identity not found");
      }

      // Check if sender identity is used by any broadcasts
      const broadcastCount = await prisma.broadcast.count({
        where: {
          senderIdentityId: id,
        },
      });

      if (broadcastCount > 0) {
        return responseBadRequest(
          `Cannot delete sender identity: it is used by ${broadcastCount} broadcast${broadcastCount === 1 ? "" : "s"}`,
        );
      }

      // Delete the sender identity
      await prisma.senderIdentity.delete({
        where: { id },
      });

      return responseOk({ id }, "sender_identity");
    }),
  );
}
