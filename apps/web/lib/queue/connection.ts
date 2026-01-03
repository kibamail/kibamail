/**
 * BullMQ Connection Configuration
 *
 * Provides Redis connection configuration for BullMQ queues and workers.
 * Supports both standalone Redis and Redis Cluster mode.
 */

import type { ConnectionOptions } from "bullmq";
import { Cluster } from "ioredis";
import { env } from "@/env/schema";

/**
 * BullMQ connection type - can be ConnectionOptions or ioredis Cluster instance
 */
type QueueConnection = ConnectionOptions | Cluster;

/**
 * Get BullMQ connection options
 *
 * Returns connection configuration for BullMQ queues and workers.
 * In cluster mode, returns an ioredis Cluster instance.
 * In standalone mode, returns ConnectionOptions object.
 */
export function getQueueConnection(): QueueConnection {
  if (env.REDIS_CLUSTER_MODE) {
    // BullMQ requires an ioredis Cluster instance for cluster mode
    return new Cluster([{ host: env.REDIS_HOST, port: env.REDIS_PORT }], {
      redisOptions: {
        password: env.REDIS_PASSWORD,
        connectTimeout: 10000,
        keepAlive: 30000,
        maxRetriesPerRequest: null,
      },
      clusterRetryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      scaleReads: "slave",
    });
  }

  // Standalone mode
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
