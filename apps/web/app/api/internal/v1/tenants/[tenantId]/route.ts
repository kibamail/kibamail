/**
 * Internal Tenant Endpoint
 *
 * REST endpoint: /api/internal/v1/tenants/:tenantId
 *
 * Supported Methods:
 * - GET   Get tenant data (sending domains, API keys)
 *
 * Authentication: Internal Service Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { getTenant } from "./handler";

/**
 * GET /api/internal/v1/tenants/:tenantId
 *
 * Returns tenant data including:
 * - Sending domains with decrypted DKIM private keys
 * - API key hashes for authentication validation
 *
 * Authentication: Internal service key via Bearer token
 *
 * @example
 * ```bash
 * curl -H "Authorization: Bearer $INTERNAL_SERVICE_KEY" \
 *   http://localhost:3000/api/internal/v1/tenants/workspace-123
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, () => getTenant(tenantId)),
  );
}
