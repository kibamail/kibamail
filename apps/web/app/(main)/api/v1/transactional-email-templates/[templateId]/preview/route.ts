/**
 * Preview Transactional Email Template Route (External API)
 *
 * GET /api/v1/transactional-email-templates/[templateId]/preview
 *
 * Returns the HTML body with SAMPLE_VARIABLES substituted so callers
 * can render the template for QA without a live send.
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { previewTransactionalEmailTemplate } from "../../handler";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) =>
        previewTransactionalEmailTemplate(apiKey.workspaceId, templateId),
      ["read:templates"],
    ),
  );
}
