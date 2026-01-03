/**
 * Create API Key Handler
 *
 * POST /api/v1/api-keys
 */

import type { NextRequest } from "next/server";
import { createApiKeySchema } from "@/app/(main)/api/v1/api-keys/schema";
import { responseCreated } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/db";

/**
 * Create a new API key for the workspace
 *
 * Workspace is determined from the authenticated API key.
 * Returns the full API key ONLY on creation (never shown again).
 *
 * @param apiKey - Authenticated API key from withApiSession
 * @param request - Next.js request object
 * @returns Response with created API key data including full key
 */
export async function createApiKeyHandler(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(createApiKeySchema, request);

  const { key, preview } = generateApiKey();
  const keyHash = hashApiKey(key);

  const createdKey = await prisma.apiKey.create({
    data: {
      workspaceId,
      name: data.name,
      keyHash,
      keyPreview: preview,
      scopes: data.scopes,
    },
  });

  return responseCreated(
    {
      id: createdKey.id,
      key,
    },
    "api_key",
  );
}
