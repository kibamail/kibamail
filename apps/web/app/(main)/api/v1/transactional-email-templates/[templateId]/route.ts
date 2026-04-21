/**
 * Individual Transactional Email Template Route (External API)
 *
 * GET    /api/v1/transactional-email-templates/[templateId]  - Get template
 * PUT    /api/v1/transactional-email-templates/[templateId]  - Update (DRAFT only)
 * DELETE /api/v1/transactional-email-templates/[templateId]  - Delete (DRAFT only)
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import {
  deleteTransactionalEmailTemplate,
  getTransactionalEmailTemplate,
  updateTransactionalEmailTemplate,
} from "../handler";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) =>
        getTransactionalEmailTemplate(apiKey.workspaceId, templateId),
      ["read:templates"],
    ),
  );
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        updateTransactionalEmailTemplate(
          apiKey.workspaceId,
          templateId,
          request,
        ),
      ["manage:templates"],
    ),
  );
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) =>
        deleteTransactionalEmailTemplate(apiKey.workspaceId, templateId),
      ["manage:templates"],
    ),
  );
}
