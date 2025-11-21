/**
 * Internal Contact Route
 *
 * PUT /api/internal/v1/contacts/:id - Update contact
 *
 * Authentication: Session (internal dashboard)
 * Workspace is deduced from the session's current organization
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  updateContact as externalUpdateContact,
  deleteContact as externalDeleteContact,
} from "@/app/api/v1/contacts/handler";

/**
 * PUT /api/internal/v1/contacts/:id
 *
 * Update an existing contact
 * Requires session authentication
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(request, async () => {
    const { id } = await params;
    return withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      return externalUpdateContact(workspaceId, id, request);
    });
  });
}

/**
 * DELETE /api/internal/v1/contacts/:id
 *
 * Delete an existing contact
 * Requires session authentication
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(request, async () => {
    const { id } = await params;
    return withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      return externalDeleteContact(workspaceId, id);
    });
  });
}
