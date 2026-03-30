/**
 * Individual Marketing Email Route (External API)
 *
 * GET    /api/v1/marketing-emails/[emailId] - Get email details
 * PUT    /api/v1/marketing-emails/[emailId] - Update email
 * DELETE /api/v1/marketing-emails/[emailId] - Delete email
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import {
  deleteMarketingEmail,
  getMarketingEmail,
  updateMarketingEmail,
} from "../handler";

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getMarketingEmail(apiKey.workspaceId, emailId),
      ["read:emails"],
    ),
  );
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        updateMarketingEmail(apiKey.workspaceId, emailId, request),
      ["write:emails"],
    ),
  );
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { emailId } = await params;
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteMarketingEmail(apiKey.workspaceId, emailId),
      ["write:emails"],
    ),
  );
}
