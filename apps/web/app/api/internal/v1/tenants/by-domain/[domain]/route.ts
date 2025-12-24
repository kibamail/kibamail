/**
 * Internal Tenant by Domain Endpoint
 *
 * REST endpoint: /api/internal/v1/tenants/by-domain/:domain
 *
 * Supported Methods:
 * - GET   Get tenant data by sending domain name
 *
 * Authentication: Internal Service Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { getTenantByDomain } from "../../[tenantId]/handler";

/**
 * GET /api/internal/v1/tenants/by-domain/:domain
 *
 * Find tenant by sending domain name.
 * Returns domain config with decrypted DKIM private key.
 *
 * @example
 * ```bash
 * curl -H "Authorization: Bearer $INTERNAL_SERVICE_KEY" \
 *   http://localhost:3000/api/internal/v1/tenants/by-domain/example.com
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, () => getTenantByDomain(domain)),
  );
}
