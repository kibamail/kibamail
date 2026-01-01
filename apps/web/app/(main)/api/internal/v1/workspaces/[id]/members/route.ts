/**
 * Workspace Members Endpoint
 *
 * REST endpoint: /api/internal/v1/workspaces/[id]/members
 *
 * Supported Methods:
 * - POST   Invite members to workspace
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import { inviteMembers } from "./handler";

/**
 * POST /api/internal/v1/workspaces/[id]/members
 *
 * Invite members to workspace
 * Requires: invite:members permission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => inviteMembers(session, request, resolvedParams),
      ["invite:members"],
    ),
  );
}
