/**
 * Contact Property Individual Resource Routes (External API)
 *
 * GET    /api/v1/contact-properties/[contactPropertyId] - Get a contact property
 * PUT    /api/v1/contact-properties/[contactPropertyId] - Update a contact property
 * DELETE /api/v1/contact-properties/[contactPropertyId] - Delete a contact property
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import {
  deleteContactProperty,
  getContactProperty,
  updateContactProperty,
} from "@/app/(main)/api/v1/contact-properties/handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

type RouteContext = {
  params: Promise<{ contactPropertyId: string }>;
};

/**
 * GET /api/v1/contact-properties/[contactPropertyId]
 *
 * Get a specific contact property by ID.
 * Requires API key authentication with read:contact-properties scope.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { contactPropertyId } = await context.params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getContactProperty(apiKey.workspaceId, contactPropertyId),
      ["read:contact-properties"],
    ),
  );
}

/**
 * PUT /api/v1/contact-properties/[contactPropertyId]
 *
 * Update a specific contact property by ID.
 * Requires API key authentication with update:contact-properties scope.
 * Type and slot cannot be changed after creation.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { contactPropertyId } = await context.params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        updateContactProperty(apiKey.workspaceId, contactPropertyId, request),
      ["update:contact-properties"],
    ),
  );
}

/**
 * DELETE /api/v1/contact-properties/[contactPropertyId]
 *
 * Delete a specific contact property by ID (soft delete).
 * Requires API key authentication with delete:contact-properties scope.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { contactPropertyId } = await context.params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteContactProperty(apiKey.workspaceId, contactPropertyId),
      ["delete:contact-properties"],
    ),
  );
}
