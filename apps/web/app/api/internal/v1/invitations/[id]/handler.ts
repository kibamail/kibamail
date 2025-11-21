/**
 * Invitation Cancellation Endpoint - Business Logic
 *
 * Handler for DELETE /api/internal/v1/invitations/[id]
 */

import { logto } from "@/auth/logto";
import type { UserSession } from "@/lib/auth/get-session";
import { responseNoContent, responseBadRequest } from "@/lib/api/responses";
import { prisma } from "@/lib/db";

/**
 * DELETE /api/internal/v1/invitations/[id]
 *
 * Cancel an organization invitation
 */
export async function cancelInvitation(
  session: UserSession,
  params: { id: string },
) {
  const invitationId = params.id;
  const workspaceId = session.currentOrganization?.id as string;

  // Find the invitation in our database
  const invitation = await prisma.invitation.findUnique({
    where: {
      logtoInvitationId: invitationId,
    },
  });

  if (!invitation) {
    return responseBadRequest("Invitation not found");
  }

  // Verify the invitation belongs to the current workspace
  if (invitation.workspaceId !== workspaceId) {
    return responseBadRequest(
      "You don't have permission to cancel this invitation",
    );
  }

  // Cancel the invitation in Logto
  await logto.workspaces().members(workspaceId).cancelInvitation(invitationId);

  // Delete the invitation from our database
  await prisma.invitation.delete({
    where: {
      logtoInvitationId: invitationId,
    },
  });

  return responseNoContent();
}
