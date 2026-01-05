import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantByDomain } from "@/app/(main)/api/internal/v1/tenants/[tenantId]/handler";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";

/**
 * POST /api/internal/v1/tenants/by-domain
 *
 * Find tenant by sending domain name.
 * Uses POST with JSON body to avoid URL path issues with dots in domain names.
 *
 * Request body: { "domain": "example.com" }
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withServiceAuth(request, async () => {
      const body = await request.json();
      const domain = body.domain;

      if (!domain || typeof domain !== "string") {
        return NextResponse.json(
          { error: "domain is required in request body" },
          { status: 400 },
        );
      }

      return getTenantByDomain(domain);
    }),
  );
}
