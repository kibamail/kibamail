import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { validateBounceDomain } from "@/app/api/internal/v1/tenants/[tenantId]/handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, () => validateBounceDomain(domain)),
  );
}
