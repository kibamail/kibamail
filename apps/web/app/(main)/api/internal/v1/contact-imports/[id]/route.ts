/**
 * Contact Import [id] API Route
 *
 * GET /api/internal/v1/contact-imports/:id
 * Get a contact import by ID
 *
 * PATCH /api/internal/v1/contact-imports/:id
 * Update a contact import with column mapping and settings
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";

import { getContactImport, updateContactImport } from "./handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session) => getContactImport(session, id)),
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session) => updateContactImport(session, id, request)),
  );
}
