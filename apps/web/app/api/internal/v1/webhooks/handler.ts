/**
 * Webhooks Collection - Handlers
 *
 * Business logic for /api/internal/v1/webhooks endpoints
 */

import type { NextRequest } from "next/server";
import type { UserSession } from "@/lib/auth/get-session";
import {
  responseCreated,
  responseNoContent,
  responseOk,
} from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import {
  createWebhookDestinationSchema,
  updateWebhookDestinationSchema,
  type OutpostDestinationCreate,
  type OutpostDestinationUpdate,
} from "./schema";
import { outpost } from "@/webhooks/client/client";

/**
 * POST /api/internal/v1/webhooks
 *
 * Create a new webhook destination
 */
export async function createWebhookDestination(
  session: UserSession,
  request: NextRequest,
) {
  const data = await validateRequestBody(
    createWebhookDestinationSchema,
    request,
  );

  const workspaceId = session.currentOrganization?.id as string;

  const destinationPayload: OutpostDestinationCreate = {
    type: data.type,
    credentials: data.credentials,
    config: data.config,
    topics: data.topics,
    delivery_metadata: data.delivery_metadata,
    metadata: data.metadata,
  } as OutpostDestinationCreate;

  const destination = await outpost
    .tenants(workspaceId)
    .destinations()
    .create(destinationPayload);

  return responseCreated(destination);
}

/**
 * PATCH /api/internal/v1/webhooks/[id]
 *
 * Update a webhook destination
 */
export async function updateWebhookDestination(
  session: UserSession,
  request: NextRequest,
  params: { id: string },
) {
  const data = await validateRequestBody(
    updateWebhookDestinationSchema,
    request,
  );

  const workspaceId = session.currentOrganization?.id as string;

  const updatePayload: OutpostDestinationUpdate = {
    credentials: data.credentials,
    config: data.config,
    topics: data.topics,
    delivery_metadata: data.delivery_metadata,
    metadata: data.metadata,
  } as OutpostDestinationUpdate;

  // Update destination
  const destination = await outpost
    .tenants(workspaceId)
    .destinations()
    .update(params.id, updatePayload);

  return responseOk(destination);
}

/**
 * DELETE /api/internal/v1/webhooks/[id]
 *
 * Delete a webhook destination
 */
export async function deleteWebhookDestination(
  session: UserSession,
  params: { id: string },
) {
  const workspaceId = session.currentOrganization?.id as string;

  await outpost.tenants(workspaceId).destinations().delete(params.id);

  return responseNoContent();
}

/**
 * PUT /api/internal/v1/webhooks/[id]/enable
 *
 * Enable a webhook destination
 */
export async function enableWebhookDestination(
  session: UserSession,
  params: { id: string },
) {
  const workspaceId = session.currentOrganization?.id as string;

  const destination = await outpost
    .tenants(workspaceId)
    .destinations()
    .enable(params.id);

  return responseOk(destination);
}

/**
 * PUT /api/internal/v1/webhooks/[id]/disable
 *
 * Disable a webhook destination
 */
export async function disableWebhookDestination(
  session: UserSession,
  params: { id: string },
) {
  const workspaceId = session.currentOrganization?.id as string;

  const destination = await outpost
    .tenants(workspaceId)
    .destinations()
    .disable(params.id);

  return responseOk(destination);
}
