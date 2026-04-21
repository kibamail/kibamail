/**
 * Transactional Email Templates Collection Route (External API)
 *
 * GET    /api/v1/transactional-email-templates   - List templates
 * POST   /api/v1/transactional-email-templates   - Create a template
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import {
  createTransactionalEmailTemplate,
  listTransactionalEmailTemplates,
} from "./handler";

export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        listTransactionalEmailTemplates(apiKey.workspaceId, request),
      ["read:templates"],
    ),
  );
}

export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        createTransactionalEmailTemplate(apiKey.workspaceId, request),
      ["manage:templates"],
    ),
  );
}
