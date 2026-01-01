/**
 * Update Workspace Endpoint
 *
 * REST endpoint: /api/internal/v1/workspaces/:id
 *
 * Supported Methods:
 * - PATCH   Update workspace name, description, and/or logo
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import type { UserSession } from "@/lib/auth/get-session";
import { updateWorkspace } from "./handler";

/**
 * PATCH /api/internal/v1/workspaces/:id
 *
 * Update workspace details
 *
 * @example
 * ```ts
 * await fetch('/api/internal/v1/workspaces/org-123', {
 *   method: 'PATCH',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     name: 'New Workspace Name',
 *     logoUrl: 'https://cdn.example.com/organizations/org-123/logo.png'
 *   })
 * });
 * ```
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session: UserSession) =>
      updateWorkspace(session, id, request),
    ),
  );
}
