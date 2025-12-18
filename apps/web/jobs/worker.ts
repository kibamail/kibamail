/**
 * Unified Worker Process
 *
 * Single entry point that starts all queue workers in one process.
 * Each queue runs its own worker with configured concurrency.
 *
 * To run:
 * ```bash
 * bun run worker
 * # or
 * tsx jobs/worker.ts
 * ```
 */

import { closeAll, configureWorker, queue, queueLogger } from "@/lib/queue";

// Import all job processors
import { computeContactsCount } from "./segments/compute-contacts-count";
import { processImport } from "./contact-imports/process-import";

const logger = queueLogger.child({ worker: "unified" });

// ============================================================
// Configure all workers
// ============================================================

// Segments queue - for segment-related background jobs
configureWorker("segments", {
  processors: {
    "compute-contacts-count": computeContactsCount,
  },
  concurrency: 3,
});

// Contact imports queue - for processing CSV imports
configureWorker("contact-imports", {
  processors: {
    "process-import": processImport,
  },
  concurrency: 1, // Process one import at a time
});

// ============================================================
// Start all workers
// ============================================================

const queues = ["segments", "contact-imports"] as const;

for (const queueName of queues) {
  queue(queueName).start();
}

logger.info(
  {
    queues: queues.map((q) => q),
    workers: [
      { queue: "segments", jobs: ["compute-contacts-count"], concurrency: 3 },
      { queue: "contact-imports", jobs: ["process-import"], concurrency: 1 },
    ],
  },
  "All workers started"
);

// ============================================================
// Graceful shutdown
// ============================================================

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down all workers");

  await closeAll();

  logger.info("All workers stopped");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error({ error: error.message, stack: error.stack }, "Uncaught exception");
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  shutdown("unhandledRejection");
});
