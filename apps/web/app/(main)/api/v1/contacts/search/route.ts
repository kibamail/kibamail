/**
 * Contacts Search Route (External API)
 *
 * POST   /api/v1/contacts/search - Search contacts with filters
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { searchContacts } from "@/app/(main)/api/v1/contacts/handler";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";

/**
 * POST /api/v1/contacts/search
 *
 * Search contacts using segment conditions with cursor-based pagination
 * Requires API key authentication with read:contacts scope
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => searchContacts(apiKey.workspaceId, request),
      ["read:contacts"]
    )
  );
}
