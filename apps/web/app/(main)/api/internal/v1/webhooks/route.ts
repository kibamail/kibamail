/**
 * Webhooks Collection Endpoint
 *
 * REST endpoint: /api/internal/v1/webhooks
 *
 * Supported Methods:
 * - POST   Create a new webhook destination
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createWebhookDestination } from "./handler";

/**
 * POST /api/internal/v1/webhooks
 *
 * Create a new webhook destination
 * Requires: manage:webhooks permission
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => createWebhookDestination(session, request),
      ["manage:webhooks"],
    ),
  );
}
