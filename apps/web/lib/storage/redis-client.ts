/**
 * Redis Client Singleton
 *
 * Provides a singleton Redis client instance using ioredis.
 * This client is used for session storage, caching, and other Redis operations.
 * Supports both standalone Redis and Redis Cluster mode.
 *
 * @see https://github.com/redis/ioredis
 */

import Redis, { Cluster } from "ioredis";
import { env } from "@/env/schema";

/**
 * Redis client type - can be either standalone Redis or Cluster
 */
type RedisClient = Redis | Cluster;

/**
 * Global Redis client instance
 * Using singleton pattern to reuse the same connection across the application
 */
let redisClient: RedisClient | null = null;

/**
 * Get Redis Client Instance
 *
 * Returns a singleton Redis client instance. Creates a new connection
 * if one doesn't exist yet. Automatically uses cluster mode when
 * REDIS_CLUSTER_MODE is enabled.
 *
 * Features:
 * - Singleton pattern for connection reuse
 * - Automatic reconnection on connection loss
 * - Connection pooling
 * - Error handling and logging
 * - Redis Cluster support with automatic slot routing
 *
 * @returns Redis client instance
 *
 * @example
 * ```ts
 * import { getRedisClient } from '@/lib/storage/redis-client';
 *
 * const redis = getRedisClient();
 * await redis.set('key', 'value');
 * const value = await redis.get('key');
 * ```
 */
export function getRedisClient(): RedisClient {
  if (!redisClient) {
    if (env.REDIS_CLUSTER_MODE) {
      // Cluster mode - ioredis auto-discovers other nodes from this initial node
      redisClient = new Redis.Cluster(
        [{ host: env.REDIS_HOST, port: env.REDIS_PORT }],
        {
          redisOptions: {
            password: env.REDIS_PASSWORD,
            connectTimeout: 10000,
            keepAlive: 30000,
            maxRetriesPerRequest: 3,
          },
          clusterRetryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            console.log(
              `Redis cluster connection failed. Retrying in ${delay}ms...`
            );
            return delay;
          },
          enableReadyCheck: true,
          scaleReads: "slave",
        }
      );
    } else {
      // Standalone mode
      redisClient = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DATABASE,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          console.log(`Redis connection failed. Retrying in ${delay}ms...`);
          return delay;
        },
        reconnectOnError(err) {
          const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNRESET"];
          if (
            targetErrors.some((targetError) => err.message.includes(targetError))
          ) {
            return true;
          }
          return false;
        },
        connectTimeout: 10000,
        keepAlive: 30000,
        maxRetriesPerRequest: 3,
      });
    }

    // Log connection status
    redisClient.on("connect", () => {
      console.log("Redis client connected");
    });

    redisClient.on("ready", () => {
      console.log("Redis client ready");
    });

    redisClient.on("error", (err) => {
      console.error("Redis client error:", err);
    });

    redisClient.on("close", () => {
      console.log("Redis client connection closed");
    });

    redisClient.on("reconnecting", () => {
      console.log("Redis client reconnecting...");
    });
  }

  return redisClient;
}

/**
 * Close Redis Connection
 *
 * Gracefully closes the Redis connection. Should be called when
 * the application is shutting down.
 *
 * @example
 * ```ts
 * import { closeRedisClient } from '@/lib/storage/redis-client';
 *
 * // On application shutdown
 * await closeRedisClient();
 * ```
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("Redis client connection closed gracefully");
  }
}

/**
 * Default export for convenience
 */
export default getRedisClient;
