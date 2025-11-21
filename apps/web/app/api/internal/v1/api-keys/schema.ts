/**
 * API Keys Endpoint - Validation Schemas
 *
 * Schemas for /api/internal/v1/api-keys endpoints
 */

import { z } from "zod";
import { API_SCOPE_NAMES } from "@/config/api";

/**
 * POST /api/internal/v1/api-keys - Create API Key
 *
 * Request Body Schema
 */
export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  scopes: z
    .array(z.enum(API_SCOPE_NAMES as [string, ...string[]]))
    .min(1, "At least one scope is required"),
});

/**
 * POST /api/internal/v1/api-keys - Create API Key
 *
 * Response Schema
 */
export const createApiKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(), // Full key (only returned once)
  keyPreview: z.string(),
  scopes: z.array(z.string()),
  createdAt: z.string(),
});

/**
 * GET /api/internal/v1/api-keys - List API Keys
 *
 * Response Schema
 */
export const listApiKeysResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      keyPreview: z.string(),
      scopes: z.array(z.string()),
      lastUsedAt: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
});

/**
 * DELETE /api/internal/v1/api-keys/[id] - Delete API Key
 *
 * Response Schema
 */
export const deleteApiKeyResponseSchema = z.object({});

// Type exports
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponseSchema>;
export type ListApiKeysResponse = z.infer<typeof listApiKeysResponseSchema>;
export type DeleteApiKeyResponse = z.infer<typeof deleteApiKeyResponseSchema>;
