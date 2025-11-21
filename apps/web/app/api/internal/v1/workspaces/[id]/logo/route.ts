/**
 * Update Organization Logo Endpoint
 *
 * REST endpoint: /api/internal/v1/workspaces/:id/logo
 *
 * Supported Methods:
 * - PATCH   Update organization logo
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import type { UserSession } from "@/lib/auth/get-session";
import { updateOrganizationLogo } from "./handler";

/**
 * PATCH /api/internal/v1/workspaces/:id/logo
 *
 * Upload and update organization logo image
 *
 * Accepts multipart/form-data with a "logo" field containing the image file
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('logo', imageFile);
 *
 * fetch('/api/internal/v1/workspaces/org-123/logo', {
 *   method: 'PATCH',
 *   body: formData
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
      updateOrganizationLogo(session, id, request),
    ),
  );
}
