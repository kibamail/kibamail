/**
 * DELETE /api/internal/v1/invitations/[id]
 *
 * Cancel an organization invitation
 */

import type { NextRequest } from "next/server";
import { responseUnauthorized } from "@/lib/api/responses";
import { getSession } from "@/lib/auth/get-session";
import { cancelInvitation } from "./handler";

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const params = await props.params;

  if (!session) {
    return responseUnauthorized();
  }

  return cancelInvitation(session, params);
}
