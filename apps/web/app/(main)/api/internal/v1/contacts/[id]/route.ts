/**
 * Internal Contact Route
 *
 * GET /api/internal/v1/contacts/:id - Get contact with topics
 * PUT /api/internal/v1/contacts/:id - Update contact
 * DELETE /api/internal/v1/contacts/:id - Delete contact
 *
 * Authentication: Session (internal dashboard)
 * Workspace is deduced from the session's current organization
 */

import type { NextRequest } from "next/server";
import {
  deleteContact as externalDeleteContact,
  getContact as externalGetContact,
  updateContact as externalUpdateContact,
} from "@/app/(main)/api/v1/contacts/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * GET /api/internal/v1/contacts/:id
 *
 * Get a contact with topics
 * Requires session authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(request, async () => {
    const { id } = await params;
    return withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      return externalGetContact(workspaceId, id);
    });
  });
}

/**
 * PUT /api/internal/v1/contacts/:id
 *
 * Update an existing contact
 * Requires session authentication
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
  { params }: { params: Promise<{ id: string }> },
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
