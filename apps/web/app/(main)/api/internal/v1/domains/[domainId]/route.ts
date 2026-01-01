/**
 * Domain Detail Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/domains/[domainId]
 *
 * Supported Methods:
 * - GET    Get a sending domain
 * - PUT    Update a sending domain
 * - DELETE Delete a sending domain
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";

import {
  deleteSendingDomain,
  getSendingDomain,
  updateSendingDomain,
} from "@/app/(main)/api/v1/domains/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * GET /api/internal/v1/domains/[domainId]
 *
 * Get a single sending domain
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> },
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return getSendingDomain(session.currentOrganization.id, domainId);
    }),
  );
}

/**
 * PUT /api/internal/v1/domains/[domainId]
 *
 * Update a sending domain
 * Uses session-based authentication and gets workspaceId from session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> },
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return updateSendingDomain(
        session.currentOrganization.id,
        domainId,
        request,
      );
    }),
  );
}

/**
 * DELETE /api/internal/v1/domains/[domainId]
 *
 * Delete a sending domain
 * Uses session-based authentication and gets workspaceId from session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> },
) {
  const { domainId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return deleteSendingDomain(session.currentOrganization.id, domainId);
    }),
  );
}
