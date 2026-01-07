/**
 * MTA Events Webhook Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/mta-events
 *
 * Supported Methods:
 * - POST   Receive a batch of email events from the MTA
 *
 * This endpoint receives webhook callbacks from the MTA (KumoMTA)
 * containing email delivery events (deliveries, bounces, complaints, etc.).
 *
 * Note: This endpoint runs on a private network and does not require
 * authentication. In production, ensure this endpoint is only accessible
 * from the MTA cluster.
 */

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { processMtaEvents } from "./handler";

/**
 * POST /api/internal/v1/mta-events
 *
 * Receive and process a batch of email events from the MTA.
 *
 * Request body:
 * {
 *   "events": [
 *     {
 *       "type": "Delivery",
 *       "sending_id": "msg_123",
 *       "recipient": "user@example.com",
 *       "tenant_id": "workspace_456",
 *       "broadcast_id": "broadcast_789",
 *       "contact_id": "contact_012",
 *       "response": { "code": 250, "content": "OK" },
 *       "bounce_classification": "",
 *       "timestamp": "2024-01-01T12:00:00Z",
 *       "node_id": "mta-1"
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   "processed": 100,
 *   "durationMs": 50
 * }
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () => processMtaEvents(request));
}
