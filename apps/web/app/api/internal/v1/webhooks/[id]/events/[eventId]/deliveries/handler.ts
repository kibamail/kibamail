/**
 * Event Deliveries - Handlers
 *
 * Business logic for /api/internal/v1/webhooks/[id]/events/[eventId]/deliveries endpoints
 */

import type { NextRequest } from "next/server";
import { responseOk } from "@/lib/api/responses";
import type { UserSession } from "@/lib/auth/get-session";
import { outpost } from "@/webhooks/client/client";

/**
 * GET /api/internal/v1/webhooks/[id]/events/[eventId]/deliveries
 *
 * List delivery attempts for an event
 */
export async function listEventDeliveries(
  session: UserSession,
  request: NextRequest,
  params: { id: string; eventId: string },
) {
  const workspaceId = session.currentOrganization?.id as string;
  const eventId = params.eventId;

  // Fetch deliveries from Outpost
  const deliveries = await outpost
    .tenants(workspaceId)
    .events()
    .deliveries(eventId)
    .list();

  // Return deliveries
  return responseOk({
    deliveries: deliveries || [],
  });
}
