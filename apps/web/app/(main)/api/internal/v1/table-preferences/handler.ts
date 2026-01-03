/**
 * Table Preferences Handler (Internal API)
 *
 * Business logic for table preference operations.
 * Stores user preferences for table configurations in Redis.
 */

import type { NextRequest } from "next/server";
import { responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { getRedisClient } from "@/lib/storage/redis-client";
import { updateTablePreferencesSchema } from "./schema";

/**
 * Get the Redis key for table preferences
 *
 * @param userId - User ID
 * @param tableName - Table name
 * @returns Redis key
 */
function getTablePreferencesKey(userId: string, tableName: string): string {
  return `table-preferences:${userId}:${tableName}`;
}

/**
 * GET /api/internal/v1/table-preferences
 *
 * Get table preferences for a user
 */
export async function getTablePreferences(userId: string, tableName: string) {
  const redis = getRedisClient();
  const key = getTablePreferencesKey(userId, tableName);

  const config = await redis.get(key);

  if (!config) {
    return responseOk({
      tableName,
      config: { columns: [] },
    });
  }

  return responseOk({
    tableName,
    config: JSON.parse(config),
  });
}

/**
 * PUT /api/internal/v1/table-preferences
 *
 * Update table preferences for a user
 */
export async function updateTablePreferences(
  userId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateTablePreferencesSchema, request);

  const redis = getRedisClient();
  const key = getTablePreferencesKey(userId, data.tableName);

  // Store preferences in Redis (no expiration)
  await redis.set(key, JSON.stringify(data.config));

  return responseOk({
    tableName: data.tableName,
    config: data.config,
  });
}
