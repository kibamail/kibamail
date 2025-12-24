/**
 * Internal DMARC Code Lookup Endpoint
 *
 * REST endpoint: /api/internal/v1/tenants/by-dmarc-code/:code
 *
 * Supported Methods:
 * - GET   Find tenant by DMARC reporting code
 *
 * Authentication: Internal Service Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { getTenantByDmarcCode } from "../../[tenantId]/handler";

/**
 * GET /api/internal/v1/tenants/by-dmarc-code/:code
 *
 * Find tenant by DMARC reporting code.
 * Used to route DMARC aggregate reports to the correct tenant.
 *
 * @example
 * ```bash
 * curl -H "Authorization: Bearer $INTERNAL_SERVICE_KEY" \
 *   http://localhost:3000/api/internal/v1/tenants/by-dmarc-code/kovcmiefpt
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, () => getTenantByDmarcCode(code)),
  );
}
