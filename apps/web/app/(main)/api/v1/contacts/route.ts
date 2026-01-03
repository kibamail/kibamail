/**
 * Contacts Management Route (External API)
 *
 * POST   /api/v1/contacts - Create new contact
 * GET    /api/v1/contacts - List contacts (paginated)
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { createContact, listContacts } from "./handler";

/**
 * POST /api/v1/contacts
 *
 * Create a new contact
 * Requires API key authentication with write:contacts scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createContact(apiKey.workspaceId, request),
      ["write:contacts"],
    ),
  );
}

/**
 * GET /api/v1/contacts
 *
 * List contacts with pagination
 * Requires API key authentication with read:contacts scope
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listContacts(apiKey.workspaceId, request),
      ["read:contacts"],
    ),
  );
}
