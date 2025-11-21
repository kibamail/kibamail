/**
 * Webhook Destination Resource Endpoint
 *
 * REST endpoint: /api/internal/v1/webhooks/[id]
 *
 * Supported Methods:
 * - PATCH  Update a webhook destination
 * - DELETE Delete a webhook destination
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { updateWebhookDestination, deleteWebhookDestination } from "../handler";

/**
 * PATCH /api/internal/v1/webhooks/[id]
 *
 * Update a webhook destination
 * Requires: manage:webhooks permission
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => updateWebhookDestination(session, request, resolvedParams),
      ["manage:webhooks"],
    ),
  );
}

/**
 * DELETE /api/internal/v1/webhooks/[id]
 *
 * Delete a webhook destination
 * Requires: manage:webhooks permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => deleteWebhookDestination(session, resolvedParams),
      ["manage:webhooks"],
    ),
  );
}
