/**
 * Webhook Destination Disable Endpoint
 *
 * REST endpoint: /api/internal/v1/webhooks/[id]/disable
 *
 * Supported Methods:
 * - PUT Disable a webhook destination
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { disableWebhookDestination } from "../../handler";

/**
 * PUT /api/internal/v1/webhooks/[id]/disable
 *
 * Disable a webhook destination
 * Requires: manage:webhooks permission
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => disableWebhookDestination(session, resolvedParams),
      ["manage:webhooks"],
    ),
  );
}
