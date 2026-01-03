/**
 * Webhook Destination Enable Endpoint
 *
 * REST endpoint: /api/internal/v1/webhooks/[id]/enable
 *
 * Supported Methods:
 * - PUT Enable a webhook destination
 */

import type { NextRequest } from "next/server";
import { enableWebhookDestination } from "@/app/(main)/api/internal/v1/webhooks/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * PUT /api/internal/v1/webhooks/[id]/enable
 *
 * Enable a webhook destination
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
      (session) => enableWebhookDestination(session, resolvedParams),
      ["manage:webhooks"],
    ),
  );
}
