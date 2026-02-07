/**
 * MTA Test Worker
 *
 * Starts real BullMQ workers for MTA integration tests so that the full
 * production pipeline is exercised:
 *
 *   KumoMTA webhook → Next.js route handler (dev server) → BullMQ queue
 *     → THIS WORKER → processEventsWithSideEffects → database
 *
 * Usage in tests:
 * ```ts
 * import { startMtaWorker, stopMtaWorker } from "./helpers/mta-test-worker";
 *
 * beforeAll(async () => { await startMtaWorker(); });
 * afterAll(async () => { await stopMtaWorker(); });
 * ```
 *
 * Prerequisites:
 * - Redis running (used by BullMQ)
 * - Control plane dev server running on localhost:18092 (receives KumoMTA webhooks)
 * - Docker compose environment running (KumoMTA, Mailpit, etc.)
 */

import { configureWorker, queue } from "@/lib/queue";
import { processEvents } from "@/jobs/mta/process-events";

let started = false;

/**
 * Start the BullMQ "mta" worker with the real processEvents handler.
 *
 * This is the same worker configuration used in production (jobs/worker.ts),
 * but only starts the "mta" queue worker — not all 11 queues.
 */
export async function startMtaWorker(): Promise<void> {
  if (started) return;

  configureWorker("mta", {
    processors: {
      "process-events": processEvents,
    },
    concurrency: 10,
  });

  queue("mta").start();
  started = true;

  // Give the worker a moment to connect to Redis and become ready
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * Stop the BullMQ "mta" worker. Call in afterAll.
 */
export async function stopMtaWorker(): Promise<void> {
  if (!started) return;

  try {
    await queue("mta").close();
  } catch {
    // Worker may already be closed
  }

  started = false;
}
