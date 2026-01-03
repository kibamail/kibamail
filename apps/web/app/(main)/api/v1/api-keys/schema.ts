/**
 * API Keys Schema Validation (External API)
 *
 * Zod schemas for validating API key requests
 */

import { z } from "zod";
import { API_SCOPE_NAMES } from "@/config/api";

/**
 * Create API Key Request Schema
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less"),
  scopes: z
    .array(z.string())
    .min(1, "At least one scope is required")
    .max(50, "Maximum 50 scopes allowed")
    .refine(
      (scopes) => scopes.every((scope) => API_SCOPE_NAMES.includes(scope)),
      {
        message: `Invalid scope(s). Allowed scopes: ${API_SCOPE_NAMES.join(
          ", ",
        )}`,
      },
    ),
});

const _createApiKeyResponseSchema = z.object({
  object: z.literal("api_key"),
  id: z.string().describe("API key identifier"),
  key: z
    .string()
    .describe("The full API key value (only shown once on creation)"),
});

/**
 * API Key Delete Response Schema
 */
const _apiKeyDeleteResponseSchema = z.object({
  object: z.literal("api_key"),
  id: z.string().describe("ID of the deleted API key"),
});

