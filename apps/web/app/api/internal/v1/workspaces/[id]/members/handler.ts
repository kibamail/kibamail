/**
 * Workspace Members Endpoint - Business Logic
 *
 * Handlers for POST /api/internal/v1/workspaces/[id]/members
 */

import dayjs from "dayjs";
import type { NextRequest } from "next/server";
import { logto } from "@/auth/logto";
import { InternalServerError } from "@/lib/api/errors";
import {
  responseBadRequest,
  responseCreated,
  responseOk,
} from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import type { UserSession } from "@/lib/auth/get-session";
import { invalidateUserOrganizationMembership } from "@/lib/auth/user-cache";
import { prisma } from "@/lib/db";
import { toLogtoError } from "@/lib/logto/errors";
import { changeMemberRoleSchema, inviteMembersSchema } from "./schema";

/**
 * POST /api/internal/v1/workspaces/[id]/members
 *
 * Invite a member to a workspace
 *
 * Creates organization invitation via Logto Management API.
 * Does NOT send emails - Logto handles email delivery based on connector config.
 */
export async function inviteMembers(
  session: UserSession,
  request: NextRequest,
  params: { id: string }
) {
  const data = await validateRequestBody(inviteMembersSchema, request);

  const workspaceId = params.id;
  const inviterId = session.user.sub;

  const roleId = await logto
    .workspaces()
    .members(workspaceId)
    .getRoleIdByName(data.role);

  if (!roleId) {
    return responseBadRequest(
      "The role you provided does not seem to be valid. Please try again."
    );
  }

  const { data: invitation, error } = await logto
    .workspaces()
    .members(workspaceId)
    .invite(inviterId, data.email, [roleId]);

  if (error) {
    const parsedError = toLogtoError(error);

    if (parsedError.code === "entity.unique_integrity_violation") {
      return responseBadRequest(
        "This user was already invited. Please delete the current invitation to invite again."
      );
    }

    if (parsedError.code === "request.invalid_input") {
      return responseBadRequest(parsedError.message);
    }

    throw error;
  }

  if (!invitation) {
    throw new InternalServerError(
      "Failed to create member invitation. Please try again.",
      error
    );
  }

  await prisma.invitation.create({
    data: {
      inviteeEmail: data.email,
      logtoInvitationId: invitation.id,
      expiresAt: dayjs(invitation.expiresAt).toDate(),
      workspaceId,
    },
  });

  return responseCreated({});
}

/**
 * PATCH /api/internal/v1/workspaces/[id]/members/[memberId]/role
 *
 * Change a member's role in a workspace
 *
 * Updates member role via Logto Management API.
 */
export async function changeMemberRole(
  _session: UserSession,
  request: NextRequest,
  params: { id: string; memberId: string }
) {
  const data = await validateRequestBody(changeMemberRoleSchema, request);

  const workspaceId = params.id;
  const memberId = params.memberId;

  const roleId = await logto
    .workspaces()
    .members(workspaceId)
    .getRoleIdByName(data.role);

  if (!roleId) {
    return responseBadRequest(
      "The role you provided does not seem to be valid. Please try again."
    );
  }

  const { error } = await logto
    .workspaces()
    .members(workspaceId)
    .roles(memberId)
    .update([roleId]);

  if (error) {
    const parsedError = toLogtoError(error);

    if (parsedError.code === "entity.not_found") {
      return responseBadRequest("not find api key.");
    }

    throw new InternalServerError(
      "Failed to update member role. Please try again.",
      error
    );
  }

  await invalidateUserOrganizationMembership(memberId);

  return responseOk();
}
