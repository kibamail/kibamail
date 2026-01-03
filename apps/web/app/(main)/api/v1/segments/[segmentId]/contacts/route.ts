/**
 * Segment Contacts Route (External API)
 *
 * GET /api/v1/segments/[segmentId]/contacts - Get all contacts in a segment
 */

import type { NextRequest } from "next/server";
import { getSegmentContacts } from "@/app/(main)/api/v1/segments/handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

/**
 * GET /api/v1/segments/[segmentId]/contacts
 *
 * Get all contacts that match a segment's conditions with cursor pagination.
 * Requires read:contacts scope.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        getSegmentContacts(apiKey.workspaceId, segmentId, request),
      ["read:contacts"],
    ),
  );
}
