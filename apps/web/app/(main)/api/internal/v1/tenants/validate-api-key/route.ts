/**
 * Internal API Key Validation Endpoint
 *
 * REST endpoint: /api/internal/v1/tenants/validate-api-key
 *
 * Supported Methods:
 * - POST   Validate API key hash and return tenant info
 *
 * Authentication: Internal Service Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { validateApiKey } from "@/app/(main)/api/internal/v1/tenants/[tenantId]/handler";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { validateRequestBody } from "@/lib/api/validation";

/**
 * Request body schema for API key validation
 */
const validateApiKeySchema = z.object({
  keyHash: z.string().min(1, "keyHash is required"),
  requiredScopes: z.array(z.string()).optional(),
});

/**
 * POST /api/internal/v1/tenants/validate-api-key
 *
 * Validate an API key hash and return associated tenant info.
 * Used by email-agent to validate SMTP credentials.
 *
 * @example
 * ```bash
 * curl -X POST \
 *   -H "Authorization: Bearer $INTERNAL_SERVICE_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"keyHash": "sha256-hash-here", "requiredScopes": ["write:broadcasts"]}' \
 *   http://localhost:3000/api/internal/v1/tenants/validate-api-key
 * ```
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withServiceAuth(request, async () => {
      const data = await validateRequestBody(validateApiKeySchema, request);
      return validateApiKey(data.keyHash, data.requiredScopes);
    }),
  );
}
