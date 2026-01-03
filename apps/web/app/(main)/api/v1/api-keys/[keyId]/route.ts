/**
 * API Key Deletion Route (External API)
 *
 * DELETE /api/v1/api-keys/[keyId] - Delete API key
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { deleteApiKeyHandler } from "@/app/(main)/api/v1/api-keys/handlers/delete-api-key";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

/**
 * DELETE /api/v1/api-keys/[keyId]
 *
 * Delete an API key
 * Requires API key authentication
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  const resolvedParams = await params;

  return withErrorHandling(request, () =>
    withApiSession(request, (apiKey) =>
      deleteApiKeyHandler(apiKey.workspaceId, apiKey.id, resolvedParams),
    ),
  );
}
