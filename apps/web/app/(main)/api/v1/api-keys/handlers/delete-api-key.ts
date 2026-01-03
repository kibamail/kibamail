/**
 * Delete API Key Handler
 *
 * DELETE /api/v1/api-keys/[keyId]
 */

import { BadRequestError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";

/**
 * Delete an API key from the workspace
 *
 * Workspace is determined from the authenticated API key.
 * Prevents deleting the currently-used API key.
 *
 * @param workspaceId - Workspace ID from authenticated API key
 * @param currentApiKeyId - ID of the currently authenticated API key
 * @param params - Route params containing keyId
 * @returns Response confirming deletion
 */
export async function deleteApiKeyHandler(
  workspaceId: string,
  currentApiKeyId: string,
  params: { keyId: string },
) {
  const keyId = params.keyId;

  const keyToDelete = await prisma.apiKey.findUnique({
    where: { id: keyId },
  });

  if (!keyToDelete || keyToDelete.workspaceId !== workspaceId) {
    throw new BadRequestError("Could not find api key.");
  }

  if (keyToDelete.id === currentApiKeyId) {
    throw new BadRequestError(
      "Cannot delete the API key currently being used for authentication",
    );
  }

  // Delete the key
  await prisma.apiKey.delete({
    where: { id: keyId },
  });

  return responseOk(undefined, "api_key");
}
