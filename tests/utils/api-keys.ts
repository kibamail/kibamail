/**
 * API Key Test Utilities
 *
 * Helper functions for creating and managing API keys in tests.
 */

import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/db";
import { faker } from "@faker-js/faker";

/**
 * API Key creation options
 */
export interface CreateApiKeyOptions {
  workspaceId: string;
  name?: string;
  scopes?: string[];
}

/**
 * Created API key data
 */
export interface CreatedApiKey {
  id: string;
  key: string;
  workspaceId: string;
  name: string;
  scopes: string[];
}

/**
 * Create an API key for testing
 *
 * @param options - API key creation options
 * @returns Created API key data including the plain text key
 *
 * @example
 * ```ts
 * const apiKey = await createTestApiKey({
 *   workspaceId: 'workspace-123',
 *   scopes: ['read:contacts', 'write:contacts']
 * });
 *
 * // Use in requests
 * const request = apiRequest('/contacts').auth(apiKey.key).build();
 * ```
 */
export async function createTestApiKey(
  options: CreateApiKeyOptions
): Promise<CreatedApiKey> {
  const { key, preview } = generateApiKey();
  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.create({
    data: {
      workspaceId: options.workspaceId,
      name: options.name || faker.company.name() + " API Key",
      keyHash,
      keyPreview: preview,
      scopes: options.scopes || ["read:api-keys"],
    },
  });

  return {
    id: apiKey.id,
    key,
    workspaceId: apiKey.workspaceId,
    name: apiKey.name,
    scopes: apiKey.scopes as string[],
  };
}

/**
 * Create an API key with full permissions for testing
 *
 * @param workspaceId - Workspace ID
 * @returns Created API key with all scopes
 */
export async function createFullAccessApiKey(
  workspaceId: string
): Promise<CreatedApiKey> {
  return createTestApiKey({
    workspaceId,
    name: "Full Access Test Key",
    scopes: [
      "read:api-keys",
      "write:api-keys",
      "delete:api-keys",
      "read:contacts",
      "write:contacts",
      "update:contacts",
      "delete:contacts",
      "read:tags",
      "write:tags",
      "update:tags",
      "delete:tags",
      "read:topics",
      "write:topics",
      "update:topics",
      "delete:topics",
      "read:segments",
      "write:segments",
      "update:segments",
      "delete:segments",
      "read:suppression-list",
      "write:suppression-list",
      "update:suppression-list",
      "delete:suppression-list",
      "read:contact-properties",
      "write:contact-properties",
      "update:contact-properties",
      "delete:contact-properties",
    ],
  });
}

/**
 * Create an API key with read-only permissions
 *
 * @param workspaceId - Workspace ID
 * @returns Created API key with read-only scopes
 */
export async function createReadOnlyApiKey(
  workspaceId: string
): Promise<CreatedApiKey> {
  return createTestApiKey({
    workspaceId,
    name: "Read Only Test Key",
    scopes: [
      "read:api-keys",
      "read:contacts",
      "read:tags",
      "read:topics",
      "read:segments",
      "read:suppression-list",
    ],
  });
}

/**
 * Delete API keys by workspace ID (cleanup helper)
 *
 * @param workspaceId - Workspace ID to clean up
 */
export async function cleanupApiKeys(workspaceId: string): Promise<void> {
  await prisma.apiKey.deleteMany({
    where: { workspaceId },
  });
}

/**
 * Delete specific API key by ID
 *
 * @param apiKeyId - API key ID to delete
 */
export async function deleteApiKey(apiKeyId: string): Promise<void> {
  await prisma.apiKey.delete({
    where: { id: apiKeyId },
  });
}
