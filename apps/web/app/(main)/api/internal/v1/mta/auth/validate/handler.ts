/**
 * MTA Auth Validation - Handler
 *
 * Thin wrapper that accepts raw password from MTA, hashes it,
 * and delegates to the existing validateApiKey function.
 *
 * This endpoint exists because:
 * - MTA sends raw password (API key)
 * - Existing /tenants/validate-api-key expects pre-hashed keyHash
 * - Hashing in Lua is complex/unavailable
 */

import type { NextRequest } from "next/server";
import { validateApiKey } from "@/app/(main)/api/internal/v1/tenants/[tenantId]/handler";
import { responseOk } from "@/lib/api/responses";
import { createHash } from "node:crypto";

/**
 * Hash the API key using SHA256
 */
function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * POST /api/internal/v1/mta/auth/validate
 *
 * Validates SMTP credentials from MTA.
 * Body: { username: string, password: string }
 *
 * Returns: { valid: boolean, workspaceId?: string }
 */
export async function validateMtaCredentials(request: NextRequest) {
  const body = await request.json();
  const { password } = body as { username?: string; password?: string };

  if (!password) {
    return responseOk({ valid: false });
  }

  // Hash the password (API key) to match stored hash
  const keyHash = hashApiKey(password);

  try {
    // Delegate to existing validateApiKey - requires smtp:send scope
    const response = await validateApiKey(keyHash, ["smtp:send"]);

    // Parse the response to extract workspace_id
    const responseData = await response.json();

    if (responseData.valid) {
      return responseOk({
        valid: true,
        workspaceId: responseData.workspace_id,
      });
    }

    return responseOk({ valid: false });
  } catch {
    // API key not found or validation failed
    return responseOk({ valid: false });
  }
}
