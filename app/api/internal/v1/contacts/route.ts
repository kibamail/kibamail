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
import { createContactInternalSchema } from "./schema";
import { validateRequestBody } from "@/lib/api/validation";

/**
 * POST /api/internal/v1/contacts
 *
 * Create a new contact with topic subscriptions
 * Requires session authentication
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, async () =>
    withSession(request, async (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;
      const data = await validateRequestBody(createContactInternalSchema, request);

      // Create a new request with all contact data including topicIds
      const externalRequest = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(data),
      });

      // Call external API handler to create the contact (handles topics too)
      return externalCreateContact(workspaceId, externalRequest as NextRequest);
    })
  );
}
