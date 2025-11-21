/**
 * Update Invitation Status Endpoint
 *
 * PUT /api/internal/v1/invitations/[id]/status
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { updateInvitationStatus } from "./handler";

/**
 * PUT /api/internal/v1/invitations/[id]/status
 *
 * Update invitation status (accept or revoke)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  return withErrorHandling(request, () =>
    withSession(request, (session) =>
      updateInvitationStatus(session, request, resolvedParams),
    ),
  );
}
