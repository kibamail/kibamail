/**
 * API Keys Collection - Handlers
 *
 * Business logic for /api/internal/v1/api-keys endpoints
 */

import type { NextRequest } from "next/server";
import type { UserSession } from "@/lib/auth/get-session";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { createApiKeySchema } from "./schema";
import { prisma } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

/**
 * POST /api/internal/v1/api-keys
 *
 * Create a new API key for the workspace
 */
export async function createApiKey(session: UserSession, request: NextRequest) {
  const data = await validateRequestBody(createApiKeySchema, request);

  const workspaceId = session.currentOrganization?.id;
  if (!workspaceId) {
    throw new Error("No active workspace");
  }

  const { key, preview } = generateApiKey();
  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.create({
    data: {
      workspaceId,
      name: data.name,
      keyHash,
      keyPreview: preview,
      scopes: data.scopes,
    },
  });

  return responseCreated({
    id: apiKey.id,
    name: apiKey.name,
    key,
    keyPreview: apiKey.keyPreview,
    scopes: apiKey.scopes,
    createdAt: apiKey.createdAt.toISOString(),
  });
}

/**
 * GET /api/internal/v1/api-keys
 *
 * List all API keys for the workspace
 */
export async function listApiKeys(session: UserSession) {
  const apiKeys = await prisma.apiKey.findMany({
    where: { workspaceId: session.currentOrganization?.id as string },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPreview: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return responseOk(
    {
      data: apiKeys.map((key) => ({
        ...key,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
      })),
    },
    "api_key"
  );
}

/**
 * DELETE /api/internal/v1/api-keys/[id]
 *
 * Delete an API key
 */
export async function deleteApiKey(
  session: UserSession,
  params: { id: string }
) {
  await prisma.apiKey.deleteMany({
    where: {
      id: params.id,
      workspaceId: session.currentOrganization?.id as string,
    },
  });

  return responseOk({}, "api_key");
}
