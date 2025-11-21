/**
 * Redis Session Wrapper for Logto
 *
 * Implements external session storage using Redis instead of cookies.
 * This is useful when session data grows too large for cookies, especially
 * when maintaining multiple active organization sessions simultaneously.
 *
 * @see https://docs.logto.io/sdk/next/api/#sessionwrapper
 */

import { randomUUID } from "node:crypto";
import type { SessionData, SessionWrapper } from "@logto/next";
import { getRedisClient } from "@/lib/storage/redis-client";

/**
 * Redis Session Wrapper
 *
 * Stores Logto session data in Redis instead of encrypted cookies.
 * Each session is identified by a UUID stored in a cookie, and the actual
 * session data is stored in Redis with a TTL.
 *
 * Features:
 * - Stores large session data in Redis
 * - Automatic session expiration (90 days)
 * - UUID-based session identification
 * - TTL refresh on each access (keeps active sessions alive)
 * - Error handling and fallback to empty session
 *
 * @example
 * ```ts
 * import { RedisSessionWrapper } from '@/lib/auth/redis-session-wrapper';
 *
 * export const config = {
 *   // ...other config
 *   sessionWrapper: new RedisSessionWrapper(),
 * };
 * ```
 */
export class RedisSessionWrapper implements SessionWrapper {
  private readonly redis = getRedisClient();
  private readonly keyPrefix = "logto:session:";
  private readonly ttl = 60 * 60 * 24 * 90; // 90 days in seconds

  /**
   * Wrap Session Data
   *
   * Stores session data in Redis and returns a session ID to be stored in a cookie.
   *
   * @param data - Session data to store
   * @param _key - Session key (unused, for interface compatibility)
   * @returns Session ID (UUID)
   */
  async wrap(data: unknown, _key: string): Promise<string> {
    const sessionId = randomUUID();
    const redisKey = this.getRedisKey(sessionId);

    try {
      // Store session data in Redis with TTL
      await this.redis.set(redisKey, JSON.stringify(data), "EX", this.ttl);

      console.log(`Session stored in Redis: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error("Failed to store session in Redis:", error);
      throw error;
    }
  }

  /**
   * Unwrap Session Data
   *
   * Retrieves session data from Redis using the session ID.
   *
   * @param value - Session ID (UUID)
   * @param _key - Session key (unused, for interface compatibility)
   * @returns Session data or empty object if not found
   */
  async unwrap(value: string, _key: string): Promise<SessionData> {
    if (!value) {
      return {};
    }

    const redisKey = this.getRedisKey(value);

    try {
      const data = await this.redis.get(redisKey);

      if (!data) {
        console.log(`Session not found in Redis: ${value}`);
        return {};
      }

      // Refresh TTL on access
      await this.redis.expire(redisKey, this.ttl);

      console.log(`Session retrieved from Redis: ${value}`);
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to retrieve session from Redis:", error);
      return {};
    }
  }

  /**
   * Get Redis Key
   *
   * Generates the full Redis key for a session ID.
   *
   * @param sessionId - Session ID (UUID)
   * @returns Full Redis key with prefix
   */
  private getRedisKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  /**
   * Delete Session
   *
   * Removes session data from Redis. Useful for logout.
   *
   * @param sessionId - Session ID (UUID)
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const redisKey = this.getRedisKey(sessionId);

    try {
      await this.redis.del(redisKey);
      console.log(`Session deleted from Redis: ${sessionId}`);
    } catch (error) {
      console.error("Failed to delete session from Redis:", error);
    }
  }
}
