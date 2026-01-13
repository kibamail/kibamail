/**
 * Individual Template Group Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/template-groups/[groupId]
 *
 * Supported Methods:
 * - GET     Get template group details
 * - PUT     Update template group
 * - DELETE  Delete template group (soft delete)
 */

import type { NextRequest } from "next/server";
import {
  deleteTemplateGroup,
  getTemplateGroup,
  updateTemplateGroup,
} from "../handler";
import { withErrorHandling, withSession } from "@/lib/api/requests";

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

/**
 * GET /api/internal/v1/template-groups/[groupId]
 *
 * Get a specific template group by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { groupId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return getTemplateGroup(session.currentOrganization.id, groupId);
      },
      ["read:templates"],
    ),
  );
}

/**
 * PUT /api/internal/v1/template-groups/[groupId]
 *
 * Update a specific template group by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { groupId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session, request) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return updateTemplateGroup(
          session.currentOrganization.id,
          groupId,
          request,
        );
      },
      ["manage:templates"],
    ),
  );
}

/**
 * DELETE /api/internal/v1/template-groups/[groupId]
 *
 * Soft delete a specific template group by ID.
 * Templates in the group will become ungrouped.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { groupId } = await params;
  return withErrorHandling(request, () =>
    withSession(
      request,
      (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }
        return deleteTemplateGroup(session.currentOrganization.id, groupId);
      },
      ["manage:templates"],
    ),
  );
}
