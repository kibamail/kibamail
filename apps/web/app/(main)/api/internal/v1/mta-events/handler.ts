/**
 * MTA Events Handler
 *
 * Processes email events received from the MTA via webhook.
 * Handles bulk insertion and side effects (bounces, complaints).
 */

import type { NextRequest } from "next/server";
import { queueLogger } from "@/lib/queue";
import { processEventsWithSideEffects, type EmailEvent } from "@/lib/mta";
import { responseOk } from "@/lib/api/responses";

const logger = queueLogger.child({ module: "mta-events-webhook" });

/**
 * Process a batch of MTA events
 *
 * Receives events from the MTA webhook and processes them:
 * - Bulk inserts events into the database
 * - Creates suppression entries for bounces and complaints
 * - Logs delivery statistics
 */
export async function processMtaEvents(request: NextRequest) {
  const startTime = Date.now();

  // Parse request body - trusted internal system, no validation needed
  const body = await request.json();
  const events: EmailEvent[] = body.events || [];

  if (events.length === 0) {
    return responseOk({
      processed: 0,
      message: "No events to process",
    });
  }

  logger.info(
    { count: events.length },
    "Received MTA events webhook",
  );

  // Group events by type for logging
  const eventsByType = new Map<string, number>();
  for (const event of events) {
    eventsByType.set(event.type, (eventsByType.get(event.type) || 0) + 1);
  }

  logger.debug(
    { eventsByType: Object.fromEntries(eventsByType) },
    "Event types breakdown",
  );

  // Process events with side effects (bounces, complaints, etc.)
  await processEventsWithSideEffects(events);

  const duration = Date.now() - startTime;

  logger.info(
    {
      count: events.length,
      durationMs: duration,
      eventsPerSecond: Math.round((events.length / duration) * 1000),
    },
    "MTA events processed",
  );

  return responseOk({
    processed: events.length,
    durationMs: duration,
  });
}
