/**
 * Delete API Key Handler
 *
 * DELETE /api/v1/api-keys/[keyId]
 */

import type { ApiKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { responseOk } from "@/lib/api/responses";
import { BadRequestError } from "@/lib/api/errors";

/**
 * Delete an API key
 *
 * Workspace is determined from the authenticated API key.
 * Prevents deletion of the currently authenticated API key.
 *
 * @param apiKey - Authenticated API key from withApiSession
 * @param params - Route parameters containing keyId
 * @returns Success response
 */
export async function deleteApiKeyHandler(
  apiKey: ApiKey,
  params: { keyId: string },
) {
  const keyId = params.keyId;
  const workspaceId = apiKey.workspaceId;

  const keyToDelete = await prisma.apiKey.findUnique({
    where: { id: keyId },
  });

  if (!keyToDelete || keyToDelete.workspaceId !== workspaceId) {
    throw new BadRequestError("Could not find the API key to delete.");
  }

  if (keyToDelete.id === apiKey.id) {
    throw new BadRequestError(
      "Cannot delete the API key currently being used for authentication",
    );
  }

  await prisma.apiKey.delete({
    where: { id: keyId },
  });

  return responseOk(
    {
      id: keyToDelete.id,
    },
    "api_key",
  );
}
