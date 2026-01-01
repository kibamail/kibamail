/**
 * Activate Workspace Endpoint
 *
 * REST endpoint: /api/internal/v1/workspaces/:id/activate
 *
 * Supported Methods:
 * - POST   Set workspace as active
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import type { UserSession } from "@/lib/auth/get-session";
import { activateWorkspace } from "./handler";

/**
 * POST /api/internal/v1/workspaces/:id/activate
 *
 * Activate (switch to) this workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session: UserSession) =>
      activateWorkspace(session, id),
    ),
  );
}
