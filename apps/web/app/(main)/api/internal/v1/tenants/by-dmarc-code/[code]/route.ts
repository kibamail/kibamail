import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { getTenantByDmarcCode } from "@/app/(main)/api/internal/v1/tenants/[tenantId]/handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, () => getTenantByDmarcCode(code)),
  );
}
