/**
 * Individual Automation Route (External API)
 *
 * GET    /api/v1/automations/[automationId] - Get specific automation
 * PUT    /api/v1/automations/[automationId] - Update specific automation
 * DELETE /api/v1/automations/[automationId] - Delete specific automation
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import {
  getAutomation,
  updateAutomation,
  deleteAutomation,
} from "@/app/(main)/api/v1/automations/handler";

/**
 * GET /api/v1/automations/[automationId]
 *
 * Get a specific automation
 * Requires API key authentication with read:automations scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey) => getAutomation(apiKey.workspaceId, automationId),
      ["read:automations"]
    );
  });
}

/**
 * PUT /api/v1/automations/[automationId]
 *
 * Update a specific automation (DRAFT only)
 * Requires API key authentication with write:automations scope
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey, request) =>
        updateAutomation(apiKey.workspaceId, automationId, request),
      ["write:automations"]
    );
  });
}

/**
 * DELETE /api/v1/automations/[automationId]
 *
 * Delete a specific automation (soft delete)
 * Requires API key authentication with delete:automations scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey) => deleteAutomation(apiKey.workspaceId, automationId),
      ["delete:automations"]
    );
  });
}
