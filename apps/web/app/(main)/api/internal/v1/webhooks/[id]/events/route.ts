/**
 * Webhook Events Routes
 *
 * GET  /api/internal/v1/webhooks/[id]/events - List events for webhook
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { listWebhookEvents } from "./handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => listWebhookEvents(session, request, resolvedParams),
      [],
    ),
  );
}
