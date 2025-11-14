/**
 * Topic Contacts Route (External API)
 *
 * GET /api/v1/topics/[topicId]/contacts - Get all contacts subscribed to a topic
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { getTopicContacts } from "../../handler";

/**
 * GET /api/v1/topics/[topicId]/contacts
 *
 * Get all contacts subscribed to a topic with cursor pagination.
 * Requires read:contacts scope.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => getTopicContacts(apiKey, topicId, request),
      ["read:contacts"]
    )
  );
}
