/**
 * Webhook Events - Handlers
 *
 * Business logic for /api/internal/v1/webhooks/[id]/events endpoints
 */

import type { NextRequest } from "next/server";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { outpost } from "@/webhooks/client/client";
import { listEventsQuerySchema } from "../../schema";

/**
 * GET /api/internal/v1/webhooks/[id]/events
 *
 * List events for a webhook destination
 */
export async function listWebhookEvents(
  session: UserSession,
  request: NextRequest,
  params: { id: string },
) {
  const workspaceId = session.currentOrganization?.id as string;
  const destinationId = params.id;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = listEventsQuerySchema.parse({
    next: searchParams.get("next") || undefined,
    prev: searchParams.get("prev") || undefined,
    limit: searchParams.get("limit") || undefined,
    start: searchParams.get("start") || undefined,
    status: searchParams.get("status") || undefined,
  });

  // Fetch events from Outpost
  const eventsResponse = await outpost
    .tenants(workspaceId)
    .destinations()
    .events(destinationId)
    .list({
      next: queryParams.next,
      prev: queryParams.prev,
      limit: queryParams.limit ?? 15,
      start: queryParams.start,
      status: queryParams.status,
    });

  // Return paginated response
  return responseOk({
    events: eventsResponse?.data || [],
    count: eventsResponse?.count || 0,
    next: eventsResponse?.next || null,
    prev: eventsResponse?.prev || null,
  });
}
