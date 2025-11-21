/**
 * Redis Client Singleton
 *
 * Provides a singleton Redis client instance using ioredis.
 * This client is used for session storage, caching, and other Redis operations.
 *
 * @see https://github.com/redis/ioredis
 */

import Redis from "ioredis";
import { env } from "@/env/schema";

/**
 * Global Redis client instance
 * Using singleton pattern to reuse the same connection across the application
 */
let redisClient: Redis | null = null;

/**
 * Get Redis Client Instance
 *
 * Returns a singleton Redis client instance. Creates a new connection
 * if one doesn't exist yet.
 *
 * Features:
 * - Singleton pattern for connection reuse
 * - Automatic reconnection on connection loss
 * - Connection pooling
 * - Error handling and logging
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
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DATABASE,
      // Retry strategy for connection failures
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis connection failed. Retrying in ${delay}ms...`);
        return delay;
      },
      // Reconnect on error
      reconnectOnError(err) {
        const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNRESET"];
        if (
          targetErrors.some((targetError) => err.message.includes(targetError))
        ) {
          // Reconnect when specific errors occur
          return true;
        }
        return false;
      },
      // Connection timeout
      connectTimeout: 10000,
      // Enable keep-alive
      keepAlive: 30000,
      // Max retry attempts
      maxRetriesPerRequest: 3,
    });

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
