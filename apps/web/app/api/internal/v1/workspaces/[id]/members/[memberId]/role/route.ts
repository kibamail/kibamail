/**
 * Workspace Member Role Endpoint
 *
 * REST endpoint: /api/internal/v1/workspaces/[id]/members/[memberId]/role
 *
 * Supported Methods:
 * - PATCH   Change member role
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import { changeMemberRole } from "../../handler";

/**
 * PATCH /api/internal/v1/workspaces/[id]/members/[memberId]/role
 *
 * Change member role in workspace
 * Requires: manage:members permission
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const resolvedParams = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => changeMemberRole(session, request, resolvedParams),
      ["manage:members"],
    ),
  );
}
