/**
 * Internal Contacts Endpoints - Business Logic
 *
 * Handlers for managing contacts via internal API (dashboard)
 * Uses session authentication (withSession)
 * Reuses external API logic (which now handles topics)
 */

import type { NextRequest } from "next/server";
import { validateRequestBody } from "@/lib/api/validation";
import { createContactInternalSchema, updateContactInternalSchema } from "./schema";
import {
  createContact as externalCreateContact,
  updateContact as externalUpdateContact,
} from "@/app/api/v1/contacts/handler";

/**
 * POST /api/internal/v1/contacts
 *
 * Create a new contact for the workspace with topic subscriptions
 * Delegates to external API handler (which handles topics)
 */
export async function createContact(workspaceId: string, request: NextRequest) {
  const data = await validateRequestBody(createContactInternalSchema, request);

  // Create a new request with all data (including topics)
  const externalRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(data),
  });

  // Call the external API handler (handles topics internally)
  return externalCreateContact(workspaceId, externalRequest as NextRequest);
}

/**
 * PUT /api/internal/v1/contacts/:id
 *
 * Update an existing contact with topic subscriptions
 * Delegates to external API handler (which handles topics)
 */
export async function updateContact(
  workspaceId: string,
  contactId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateContactInternalSchema, request);

  // Create a new request with all data (including topics)
  const externalRequest = new Request(request.url, {
    method: "PUT",
    headers: request.headers,
    body: JSON.stringify(data),
  });

  // Call the external API handler (handles topics internally)
  return externalUpdateContact(workspaceId, contactId, externalRequest as NextRequest);
}
