/**
 * Contact Properties Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/contact-properties
 *
 * Supported Methods:
 * - POST   Create a new contact property
 * - GET    List all contact properties for workspace
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createContactProperty, listContactProperties } from "@/app/(main)/api/v1/contact-properties/handler";

/**
 * POST /api/internal/v1/contact-properties
 *
 * Create a new contact property
 * Requires: manage:contact-properties permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request, 
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return createContactProperty(session.currentOrganization.id, request);
      },
      ["manage:contacts"]
    )
  );
}

/**
 * GET /api/internal/v1/contact-properties
 *
 * List all contact properties for workspace
 * Requires: read:contact-properties permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return listContactProperties(session.currentOrganization.id, request);
      },
      ["read:contacts"]
    )
  );
}
