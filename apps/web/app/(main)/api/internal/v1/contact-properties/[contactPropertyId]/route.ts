/**
 * Individual Contact Property Management Route (Internal API)
 *
 * GET    /api/internal/v1/contact-properties/[contactPropertyId] - Get specific contact property
 * PUT    /api/internal/v1/contact-properties/[contactPropertyId] - Update specific contact property
 * DELETE /api/internal/v1/contact-properties/[contactPropertyId] - Delete specific contact property
 *
 * Uses session-based authentication and reuses external API handlers
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  getContactProperty,
  updateContactProperty,
  deleteContactProperty,
} from "@/app/(main)/api/v1/contact-properties/handler";

/**
 * GET /api/internal/v1/contact-properties/[contactPropertyId]
 *
 * Get a specific contact property
 * Requires: read:contacts permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactPropertyId: string }> }
) {
  const { contactPropertyId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getContactProperty(
          session.currentOrganization.id,
          contactPropertyId
        );
      },
      ["read:contacts"]
    )
  );
}

/**
 * PUT /api/internal/v1/contact-properties/[contactPropertyId]
 *
 * Update a specific contact property
 * Requires: manage:contacts permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contactPropertyId: string }> }
) {
  const { contactPropertyId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateContactProperty(
          session.currentOrganization.id,
          contactPropertyId,
          request
        );
      },
      ["manage:contacts"]
    )
  );
}

/**
 * DELETE /api/internal/v1/contact-properties/[contactPropertyId]
 *
 * Delete a specific contact property
 * Requires: manage:contacts permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactPropertyId: string }> }
) {
  const { contactPropertyId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteContactProperty(
          session.currentOrganization.id,
          contactPropertyId
        );
      },
      ["manage:contacts"]
    )
  );
}
