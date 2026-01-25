/**
 * Update Invitation Status Endpoint
 *
 * PUT /api/internal/v1/invitations/[id]/status
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getPostHogClient } from "@/lib/posthog-server";
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
    withSession(request, async (session) => {
      const response = await updateInvitationStatus(
        session,
        request,
        resolvedParams,
      );

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: session.user.sub,
        event: "invitation_responded",
        properties: {
          invitation_id: resolvedParams.id,
        },
      });

      return response;
    }),
  );
}
