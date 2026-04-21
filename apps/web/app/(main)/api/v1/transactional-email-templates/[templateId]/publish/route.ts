/**
 * Publish Transactional Email Template Route (External API)
 *
 * POST /api/v1/transactional-email-templates/[templateId]/publish
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { publishTransactionalEmailTemplate } from "../../handler";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) =>
        publishTransactionalEmailTemplate(apiKey.workspaceId, templateId),
      ["manage:templates"],
    ),
  );
}
