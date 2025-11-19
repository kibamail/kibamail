/**
 * Form Resource Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/forms/[formId]
 *
 * Supported Methods:
 * - GET    Get form by ID
 * - PUT    Update form
 * - DELETE Delete form
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getForm, updateForm, deleteForm } from "@/app/api/v1/forms/handler";

/**
 * GET /api/internal/v1/forms/[formId]
 *
 * Get a specific form by ID
 * Requires: read:forms permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getForm(session.currentOrganization.id, formId);
      },
      ["read:forms"]
    )
  );
}

/**
 * PUT /api/internal/v1/forms/[formId]
 *
 * Update a specific form by ID
 * Requires: manage:forms permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateForm(session.currentOrganization.id, formId, request);
      },
      ["manage:forms"]
    )
  );
}

/**
 * DELETE /api/internal/v1/forms/[formId]
 *
 * Delete a specific form by ID
 * Requires: manage:forms permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteForm(session.currentOrganization.id, formId);
      },
      ["manage:forms"]
    )
  );
}
