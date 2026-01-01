/**
 * Update Invitation Status Endpoint - Business Logic
 *
 * Handlers for PUT /api/internal/v1/invitations/[id]/status
 */

import type { NextRequest } from "next/server";
import { logto } from "@/auth/logto";
import type { UserSession } from "@/lib/auth/get-session";
import { responseOk, responseBadRequest } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { updateInvitationStatusSchema } from "./schema";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api/errors";
import { toLogtoError } from "@/lib/logto/errors";

/**
 * PUT /api/internal/v1/invitations/[id]/status
 *
 * Update organization invitation status (accept or revoke)
 *
 * Updates the invitation via Logto Management API and syncs with local database.
 */
export async function updateInvitationStatus(
  session: UserSession,
  request: NextRequest,
  params: { id: string },
) {
  const data = await validateRequestBody(updateInvitationStatusSchema, request);
  const invitationId = params.id;

  // Find invitation in database
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  // Verify invitation belongs to current user
  if (invitation.inviteeEmail !== session.user.email) {
    throw new NotFoundError("Invitation not found");
  }

  // Check if invitation is still pending (only for accept)
  if (data.status === "Accepted" && invitation.status !== "PENDING") {
    return responseBadRequest("This invitation has already been processed");
  }

  // Check if invitation has expired (only for accept)
  if (data.status === "Accepted" && invitation.expiresAt < new Date()) {
    return responseBadRequest("This invitation has expired");
  }

  // Update status in Logto
  const { error } = await logto
    .users()
    .invitations()
    .update(invitation.logtoInvitationId, {
      status: data.status,
      acceptedUserId: data.status === "Accepted" ? session.user.sub : null,
    });

  if (error) {
    const parsedError = toLogtoError(error);

    if (parsedError.code === "entity.not_found") {
      return responseBadRequest(
        "Invitation not found in authentication system",
      );
    }

    throw error;
  }

  // Update or delete invitation in database based on status
  if (data.status === "Accepted") {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED" },
    });
  } else {
    // Delete revoked invitations
    await prisma.invitation.delete({
      where: { id: invitationId },
    });
  }

  return responseOk({});
}
