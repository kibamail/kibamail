import type { NextRequest } from "next/server";
import { getTenantByDomain } from "@/app/(main)/api/internal/v1/tenants/[tenantId]/handler";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, () => getTenantByDomain(domain)),
  );
}
