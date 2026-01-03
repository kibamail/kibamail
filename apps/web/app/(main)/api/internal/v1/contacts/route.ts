/**
 * Internal Contacts Route
 *
 * POST /api/internal/v1/contacts - Create new contact with topics
 *
 * Authentication: Session (internal dashboard)
 * Workspace is deduced from the session's current organization
 */

import { ContactSourceType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { createContact } from "@/app/(main)/api/v1/contacts/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * POST /api/internal/v1/contacts
 *
 * Create a new contact with topic subscriptions
 * Requires session authentication
 * Sets sourceType to MANUAL since contact is created via dashboard
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, async () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      return createContact(workspaceId, request, {
        sourceType: ContactSourceType.MANUAL,
      });
    }),
  );
}
