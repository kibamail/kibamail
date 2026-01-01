/**
 * Event Deliveries Routes
 *
 * GET  /api/internal/v1/webhooks/[id]/events/[eventId]/deliveries - List delivery attempts for event
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { listEventDeliveries } from "./handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const resolvedParams = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => listEventDeliveries(session, request, resolvedParams),
      [],
    ),
  );
}
