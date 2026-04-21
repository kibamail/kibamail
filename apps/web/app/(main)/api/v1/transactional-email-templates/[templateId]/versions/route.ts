/**
 * Transactional Email Template Versions Route (External API)
 *
 * GET  /api/v1/transactional-email-templates/[templateId]/versions  - List versions
 * POST /api/v1/transactional-email-templates/[templateId]/versions  - Create a new DRAFT version
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import {
  createTransactionalEmailTemplateVersion,
  listTransactionalEmailTemplateVersions,
} from "../../handler";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) =>
        listTransactionalEmailTemplateVersions(apiKey.workspaceId, templateId),
      ["read:templates"],
    ),
  );
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) =>
        createTransactionalEmailTemplateVersion(apiKey.workspaceId, templateId),
      ["manage:templates"],
    ),
  );
}
