/**
 * Internal Bounce Domain Validation Endpoint
 *
 * REST endpoint: /api/internal/v1/tenants/by-bounce-domain/:domain
 *
 * Supported Methods:
 * - GET   Validate if bounce domain belongs to a tenant
 *
 * Authentication: Internal Service Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { validateBounceDomain } from "../../[tenantId]/handler";

/**
 * GET /api/internal/v1/tenants/by-bounce-domain/:domain
 *
 * Validate if a bounce domain belongs to a tenant.
 * Bounce domain format: kb.<tenant-domain>
 *
 * @example
 * ```bash
 * curl -H "Authorization: Bearer $INTERNAL_SERVICE_KEY" \
 *   http://localhost:3000/api/internal/v1/tenants/by-bounce-domain/kb.example.com
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, () => validateBounceDomain(domain)),
  );
}
