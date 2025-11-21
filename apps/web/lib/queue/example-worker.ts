/**
 * Example Queue Worker
 *
 * This file demonstrates how to configure and start a queue worker.
 * Copy this file and modify it for your own queues.
 *
 * To run this worker:
 * ```bash
 * bun run lib/queue/example-worker.ts
 * ```
 */

import { configureWorker, queue, queueLogger } from "./index";

const logger = queueLogger.child({ worker: "example" });

// Configure the worker with processors for each job type
configureWorker("example", {
  processors: {
    "example-job": async (data, jobId) => {
      logger.info({ jobId, message: data.message }, "Processing job");

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info({ jobId }, "Job completed");
    },
  },

  // Process up to 5 jobs concurrently
  concurrency: 5,

  // Optional: Rate limiting
  // rateLimiter: {
  //   max: 100,      // Max 100 jobs
  //   duration: 1000, // Per second
  // },
});

// Start the worker
queue("example").start();

logger.info(
  { jobs: ["example-job"], concurrency: 5 },
  "Example worker started",
);

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down worker");
  await queue("example").close();
  logger.info("Worker stopped");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
