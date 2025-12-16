/**
 * Domains Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/domains
 *
 * Supported Methods:
 * - GET    List all sending domains
 * - POST   Create a new sending domain
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";

import {
  createSendingDomain,
  listSendingDomains,
} from "@/app/api/v1/domains/handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

/**
 * GET /api/internal/v1/domains
 *
 * List all sending domains with cursor-based pagination
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return listSendingDomains(session.currentOrganization.id, request);
    }),
  );
}

/**
 * POST /api/internal/v1/domains
 *
 * Create a new sending domain
 * Uses session-based authentication and gets workspaceId from session
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }
      return createSendingDomain(session.currentOrganization.id, request);
    }),
  );
}
