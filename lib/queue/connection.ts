/**
 * BullMQ Connection Configuration
 *
 * Provides Redis connection configuration for BullMQ queues and workers
 */

import type { ConnectionOptions } from "bullmq";
import { env } from "@/env/schema";

/**
 * Get BullMQ connection options
 *
 * BullMQ expects a ConnectionOptions object rather than an ioredis instance
 * for better connection management across queues and workers.
 */
export function getQueueConnection(): ConnectionOptions {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DATABASE,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    connectTimeout: 10000,
    keepAlive: 30000,
    // Set to null for Next.js/serverless contexts to avoid "worker has exited" errors
    // See: https://github.com/OptimalBits/bull/issues/1873
    maxRetriesPerRequest: null,
  };
}
