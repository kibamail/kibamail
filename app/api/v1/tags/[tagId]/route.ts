/**
 * Individual Tag Management Route (External API)
 *
 * GET    /api/v1/tags/[tagId] - Get specific tag
 * PUT    /api/v1/tags/[tagId] - Update specific tag
 * DELETE /api/v1/tags/[tagId] - Delete specific tag
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { getTag, updateTag, deleteTag } from "../handler";

/**
 * GET /api/v1/tags/[tagId]
 *
 * Get a specific tag
 * Requires API key authentication with read:tags scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getTag(apiKey, tagId),
      ["read:tags"]
    ),
  );
}

/**
 * PUT /api/v1/tags/[tagId]
 *
 * Update a specific tag
 * Requires API key authentication with update:tags scope
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => updateTag(apiKey, tagId, request),
      ["update:tags"]
    ),
  );
}

/**
 * DELETE /api/v1/tags/[tagId]
 *
 * Delete a specific tag
 * Requires API key authentication with delete:tags scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteTag(apiKey, tagId),
      ["delete:tags"]
    ),
  );
}
