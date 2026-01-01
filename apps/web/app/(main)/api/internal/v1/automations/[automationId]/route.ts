/**
 * Automation Resource Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/automations/[automationId]
 *
 * Supported Methods:
 * - GET    Get automation by ID
 * - PUT    Update automation
 * - DELETE Delete automation
 *
 * Reuses external API handlers with session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  getAutomation,
  updateAutomation,
  deleteAutomation,
} from "@/app/(main)/api/v1/automations/handler";

/**
 * GET /api/internal/v1/automations/[automationId]
 *
 * Get a specific automation by ID
 * Requires: read:automations permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  const { automationId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getAutomation(session.currentOrganization.id, automationId);
      },
      ["read:automations"]
    )
  );
}

/**
 * PUT /api/internal/v1/automations/[automationId]
 *
 * Update a specific automation by ID
 * Requires: manage:automations permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  const { automationId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateAutomation(
          session.currentOrganization.id,
          automationId,
          request
        );
      },
      ["manage:automations"]
    )
  );
}

/**
 * DELETE /api/internal/v1/automations/[automationId]
 *
 * Delete a specific automation by ID
 * Requires: manage:automations permission
 * Uses session-based authentication and gets workspaceId from session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  const { automationId } = await params;

  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteAutomation(session.currentOrganization.id, automationId);
      },
      ["manage:automations"]
    )
  );
}
