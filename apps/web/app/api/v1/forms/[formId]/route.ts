/**
 * Forms Individual Resource Route (External API)
 *
 * GET    /api/v1/forms/[formId] - Get form by ID
 * PUT    /api/v1/forms/[formId] - Update form (DRAFT only)
 * DELETE /api/v1/forms/[formId] - Delete form
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withApiSession } from "@/lib/api/requests";
import { getForm, updateForm, deleteForm } from "../handler";

/**
 * GET /api/v1/forms/[formId]
 *
 * Get a specific form by ID
 * Requires API key authentication with read:forms scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => getForm(apiKey.workspaceId, formId),
      ["read:forms"]
    )
  );
}

/**
 * PUT /api/v1/forms/[formId]
 *
 * Update a specific form by ID
 * Only DRAFT forms can be edited
 * Requires API key authentication with update:forms scope
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => updateForm(apiKey.workspaceId, formId, request),
      ["update:forms"]
    )
  );
}

/**
 * DELETE /api/v1/forms/[formId]
 *
 * Delete a specific form by ID
 * Requires API key authentication with delete:forms scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey) => deleteForm(apiKey.workspaceId, formId),
      ["delete:forms"]
    )
  );
}
