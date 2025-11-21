/**
 * Internal Contacts Route
 *
 * POST /api/internal/v1/contacts - Create new contact with topics
 *
 * Authentication: Session (internal dashboard)
 * Workspace is deduced from the session's current organization
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createContact as externalCreateContact } from "@/app/api/v1/contacts/handler";

/**
 * POST /api/internal/v1/contacts
 *
 * Create a new contact with topic subscriptions
 * Requires session authentication
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, async () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      return externalCreateContact(workspaceId, request);
    })
  );
}
