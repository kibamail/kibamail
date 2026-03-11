/**
 * Process MTA Events Job
 *
 * Processes email events received from the MTA webhook.
 * If a TransactionalEmail record is not found (race condition where webhook
 * arrives before the send job completes), the job will be retried with a delay.
 */

import type { JobProcessor } from "@/lib/queue";
import { queue, queueLogger } from "@/lib/queue";
import { processEventsWithSideEffects, type EmailEvent } from "@/lib/mta";
import { prisma } from "@/lib/db";

const logger = queueLogger.child({ job: "process-mta-events" });

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000; // 3 seconds

/**
 * Check if an event was injected via SMTP (not HTTP API).
 * SMTP events won't have pre-existing TransactionalEmail records —
 * they'll be created reactively during event processing.
 */
function isSmtpInjected(event: EmailEvent): boolean {
  return event.reception_protocol === "ESMTP" || event.reception_protocol === "ESMTP_STARTTLS";
}

/**
 * Check if any events have corresponding TransactionalEmail records
 * Returns the sendingIds that don't have records yet
 */
async function findMissingTransactionalSendingIds(events: EmailEvent[]): Promise<Set<string>> {
  // Get unique sendingIds that look like transactional email IDs (not es_ prefixed IDs from broadcasts)
  // Exclude SMTP-injected events — those are expected to not have pre-existing records
  const transactionalSendingIds = [...new Set(
    events
      .filter(e => e.sending_id && !e.sending_id.startsWith("es_") && !isSmtpInjected(e))
      .map(e => e.sending_id)
  )];

  if (transactionalSendingIds.length === 0) {
    return new Set();
  }

  // Check which ones exist
  const existingRecords = await prisma.transactionalEmail.findMany({
    where: { sendingId: { in: transactionalSendingIds } },
    select: { sendingId: true },
  });

  const existingIds = new Set(existingRecords.map(r => r.sendingId));
  return new Set(transactionalSendingIds.filter(id => !existingIds.has(id)));
}

/**
 * Check if any events have corresponding BroadcastSend records
 * Returns the sendingIds that don't have records yet
 */
async function findMissingBroadcastSendingIds(events: EmailEvent[]): Promise<Set<string>> {
  // Get unique sendingIds that look like broadcast IDs (es_ prefixed)
  const broadcastSendingIds = [...new Set(
    events
      .filter(e => e.sending_id && e.sending_id.startsWith("es_"))
      .map(e => e.sending_id)
  )];

  if (broadcastSendingIds.length === 0) {
    return new Set();
  }

  // Check which ones exist
  const existingRecords = await prisma.broadcastSend.findMany({
    where: { sendingId: { in: broadcastSendingIds } },
    select: { sendingId: true },
  });

  const existingIds = new Set(existingRecords.map(r => r.sendingId));
  return new Set(broadcastSendingIds.filter(id => !existingIds.has(id)));
}

export const processEvents: JobProcessor<"mta", "process-events"> = async (
  data,
  jobId,
) => {
  const { events, attempt = 0 } = data;

  logger.info(
    { jobId, eventCount: events.length, attempt },
    "Processing MTA events"
  );

  // Check for missing records (race condition where webhook arrives before send job completes)
  const missingTransactionalIds = await findMissingTransactionalSendingIds(events as EmailEvent[]);
  const missingBroadcastIds = await findMissingBroadcastSendingIds(events as EmailEvent[]);

  const hasMissingRecords = missingTransactionalIds.size > 0 || missingBroadcastIds.size > 0;

  if (hasMissingRecords && attempt < MAX_RETRY_ATTEMPTS) {
    logger.info(
      {
        jobId,
        missingTransactionalIds: [...missingTransactionalIds],
        missingBroadcastIds: [...missingBroadcastIds],
        attempt
      },
      "Some email records not found, scheduling retry"
    );

    // Re-queue the job with a delay
    await queue("mta").push(
      "process-events",
      { events, attempt: attempt + 1 },
      { delay: RETRY_DELAY_MS }
    );

    return;
  }

  if (hasMissingRecords) {
    logger.warn(
      {
        jobId,
        missingTransactionalIds: [...missingTransactionalIds],
        missingBroadcastIds: [...missingBroadcastIds],
        attempt
      },
      "Email records still not found after max retries, processing anyway"
    );
  }

  // Process the events
  await processEventsWithSideEffects(events as EmailEvent[]);

  logger.info(
    { jobId, eventCount: events.length },
    "MTA events processed successfully"
  );
};
