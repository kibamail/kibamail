/**
 * Individual Sending Domain Management Route (External API)
 *
 * GET    /api/v1/domains/[domainId] - Get specific sending domain
 * PUT    /api/v1/domains/[domainId] - Update specific sending domain
 * DELETE /api/v1/domains/[domainId] - Delete specific sending domain
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import {
  getSendingDomain,
  updateSendingDomain,
  deleteSendingDomain,
} from "@/app/(main)/api/v1/domains/handler";

/**
 * GET /api/v1/domains/[domainId]
 *
 * Get a specific sending domain
 * Requires API key authentication with read:domains scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getSendingDomain(apiKey.workspaceId, domainId),
      ["read:domains"]
    )
  );
}

/**
 * PUT /api/v1/domains/[domainId]
 *
 * Update a specific sending domain
 * Requires API key authentication with update:domains scope
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) =>
        updateSendingDomain(apiKey.workspaceId, domainId, request),
      ["update:domains"]
    )
  );
}

/**
 * DELETE /api/v1/domains/[domainId]
 *
 * Delete a specific sending domain
 * Requires API key authentication with delete:domains scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteSendingDomain(apiKey.workspaceId, domainId),
      ["delete:domains"]
    )
  );
}
