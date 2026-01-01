/**
 * API Key Resource Endpoint
 *
 * REST endpoint: /api/internal/v1/api-keys/[id]
 *
 * Supported Methods:
 * - DELETE   Delete an API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { deleteApiKey } from "../handler";

/**
 * DELETE /api/internal/v1/api-keys/[id]
 *
 * Delete an API key
 * Requires: manage:api-keys permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  return withErrorHandling(request, () =>
    withSession(request, (session) => deleteApiKey(session, resolvedParams), [
      "manage:api-keys",
    ]),
  );
}
