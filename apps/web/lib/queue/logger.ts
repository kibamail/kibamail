/**
 * Queue Logger
 *
 * Pino logger instance for queue operations
 */

import pino from "pino";

/**
 * Create a pino logger instance for queues
 *
 * Note: Using synchronous logging (no worker threads) to avoid compatibility
 * issues with Next.js/Bun environment. Worker thread transports can cause
 * "the worker thread exited" errors in this context.
 */
export const queueLogger = pino({
  name: "queue",
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Create a child logger for a specific queue
 */
export function createQueueLogger(queueName: string) {
  return queueLogger.child({ queue: queueName });
}

/**
 * Create a child logger for a specific job
 *
 * Includes job data (entity IDs like broadcastId, contactId, etc.)
 * in the logger context so all logs have relevant identifiers.
 */
export function createJobLogger(
  queueName: string,
  jobName: string,
  jobId: string,
  data?: Record<string, unknown>,
) {
  return queueLogger.child({
    queue: queueName,
    job: jobName,
    jobId,
    ...data,
  });
}
