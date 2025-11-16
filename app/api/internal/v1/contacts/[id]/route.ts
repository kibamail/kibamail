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
import { updateContact } from "../handler";

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
    return withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return updateContact(session.currentOrganization.id, id, request);
    });
  });
}
