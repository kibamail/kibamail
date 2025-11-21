/**
 * Segments Worker
 *
 * Worker process for handling segment-related background jobs
 *
 * To run this worker:
 * ```bash
 * bun run jobs/segments/worker.ts
 * ```
 */

import { configureWorker, queue, queueLogger } from "@/lib/queue";
import { computeContactsCount } from "./compute-contacts-count";

const logger = queueLogger.child({ worker: "segments" });

// Configure the segments worker with all job processors
configureWorker("segments", {
  processors: {
    "compute-contacts-count": computeContactsCount,
  },
  // Process up to 3 segment jobs concurrently
  concurrency: 3,
});

// Start the worker
queue("segments").start();

logger.info(
  {
    jobs: ["compute-contacts-count"],
    concurrency: 3,
  },
  "Segments worker started",
);

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down segments worker");
  await queue("segments").close();
  logger.info("Segments worker stopped");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
