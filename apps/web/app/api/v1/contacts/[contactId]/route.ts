/**
 * Individual Contact Management Route (External API)
 *
 * GET    /api/v1/contacts/[contactId] - Get specific contact
 * PUT    /api/v1/contacts/[contactId] - Update specific contact
 * DELETE /api/v1/contacts/[contactId] - Delete specific contact
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { getContact, updateContact, deleteContact } from "../handler";

/**
 * GET /api/v1/contacts/[contactId]
 *
 * Get a specific contact
 * Requires API key authentication with read:contacts scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;
  
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getContact(apiKey.workspaceId, contactId),
      ["read:contacts"]
    ),
  );
}

/**
 * PUT /api/v1/contacts/[contactId]
 *
 * Update a specific contact
 * Requires API key authentication with update:contacts scope
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;
  
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => updateContact(apiKey.workspaceId, contactId, request),
      ["update:contacts"]
    ),
  );
}

/**
 * DELETE /api/v1/contacts/[contactId]
 *
 * Delete a specific contact
 * Requires API key authentication with delete:contacts scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;
  
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteContact(apiKey.workspaceId, contactId),
      ["delete:contacts"]
    ),
  );
}
