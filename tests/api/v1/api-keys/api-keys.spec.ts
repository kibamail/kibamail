/**
 * Integration tests for API Key Management (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/api-keys - Create new API key
 * - GET /api/v1/api-keys - List API keys with pagination
 * - DELETE /api/v1/api-keys/[keyId] - Delete API key
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/v1/api-keys/[keyId]/route";
import { GET, POST } from "@/app/api/v1/api-keys/route";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/db";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

// Test data
let testWorkspaceId: string;
let testApiKey: string;
let testApiKeyId: string;

/**
 * Helper to create a NextRequest object
 */
function createRequest(
  url: string,
  options: {
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
  },
): NextRequest {
  const headers = new Headers(options.headers || {});

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const init = {
    method: options.method,
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  return new NextRequest(url, init);
}

/**
 * Setup: Create a test workspace and API key for authentication
 */
beforeAll(async () => {
  testWorkspaceId = randomUUID();

  // Generate API key for authentication
  const { key, preview } = generateApiKey();
  testApiKey = key;
  const keyHash = hashApiKey(key);

  // Create API key in database
  const createdKey = await prisma.apiKey.create({
    data: {
      workspaceId: testWorkspaceId,
      name: "Test Auth Key",
      keyHash,
      keyPreview: preview,
      scopes: ["api-keys:create", "api-keys:read", "api-keys:delete"],
    },
  });

  testApiKeyId = createdKey.id;
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await prisma.apiKey.deleteMany({
    where: { workspaceId: testWorkspaceId },
  });
});

describe("POST /api/v1/api-keys", () => {
  test("should create a new API key with valid authentication", async () => {
    const request = createRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testApiKey}`,
      },
      body: {
        name: "Test API Key",
        scopes: ["read:api-keys", "write:api-keys"],
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("api_key");
    expect(responseData.id).toBeDefined();
    expect(responseData.key).toMatch(/^sk_[a-f0-9]{48}$/); // Full key returned

    // Cleanup
    await prisma.apiKey.delete({ where: { id: responseData.id } });
  });

  test("should reject request with missing Authorization header", async () => {
    const request = createRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      body: {
        name: "Test API Key",
        scopes: ["webhooks:read"],
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with invalid API key", async () => {
    const request = createRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      headers: {
        Authorization: "Bearer sk_invalid_key_12345678",
      },
      body: {
        name: "Test API Key",
        scopes: ["webhooks:read"],
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with invalid body (missing name)", async () => {
    const request = createRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testApiKey}`,
      },
      body: {
        scopes: ["webhooks:read"],
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with invalid body (empty scopes)", async () => {
    const request = createRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testApiKey}`,
      },
      body: {
        name: "Test Key",
        scopes: [],
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("GET /api/v1/api-keys", () => {
  let createdKeyIds: string[] = [];

  beforeAll(async () => {
    // Create multiple API keys for pagination testing
    const keys = await Promise.all([
      prisma.apiKey.create({
        data: {
          workspaceId: testWorkspaceId,
          name: "Key 1",
          keyHash: hashApiKey(generateApiKey().key),
          keyPreview: "sk_abc123...",
          scopes: ["read"],
        },
      }),
      prisma.apiKey.create({
        data: {
          workspaceId: testWorkspaceId,
          name: "Key 2",
          keyHash: hashApiKey(generateApiKey().key),
          keyPreview: "sk_def456...",
          scopes: ["write"],
        },
      }),
      prisma.apiKey.create({
        data: {
          workspaceId: testWorkspaceId,
          name: "Key 3",
          keyHash: hashApiKey(generateApiKey().key),
          keyPreview: "sk_ghi789...",
          scopes: ["admin"],
        },
      }),
    ]);

    createdKeyIds = keys.map((k) => k.id);
  });

  afterAll(async () => {
    await prisma.apiKey.deleteMany({
      where: { id: { in: createdKeyIds } },
    });
  });

  test("should list API keys with default pagination", async () => {
    const request = createRequest("http://localhost:3000/api/v1/api-keys", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${testApiKey}`,
      },
    });

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("api_key_list");
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBeGreaterThanOrEqual(4); // Auth key + 3 created
    expect(responseData.meta).toBeDefined();
    expect(responseData.meta.page).toBe(1);
    expect(responseData.meta.limit).toBe(20);
    expect(responseData.meta.total).toBeGreaterThanOrEqual(4);

    // Verify key structure (no actual key value, only preview)
    const firstKey = responseData.data[0];
    expect(firstKey.id).toBeDefined();
    expect(firstKey.name).toBeDefined();
    expect(firstKey.keyPreview).toBeDefined();
    expect(firstKey.scopes).toBeDefined();
    expect(firstKey.key).toBeUndefined(); // Full key should NOT be returned
  });

  test("should list API keys with custom pagination", async () => {
    const request = createRequest(
      "http://localhost:3000/api/v1/api-keys?page=1&limit=2",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${testApiKey}`,
        },
      },
    );

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("api_key_list");
    expect(responseData.data.length).toBe(2);
    expect(responseData.meta.page).toBe(1);
    expect(responseData.meta.limit).toBe(2);
    expect(responseData.meta.hasNextPage).toBe(true);
  });

  test("should reject request with missing Authorization header", async () => {
    const request = createRequest("http://localhost:3000/api/v1/api-keys", {
      method: "GET",
    });

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("DELETE /api/v1/api-keys/[keyId]", () => {
  let keyToDelete: string;

  beforeAll(async () => {
    const key = await prisma.apiKey.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Key to Delete",
        keyHash: hashApiKey(generateApiKey().key),
        keyPreview: "sk_delete...",
        scopes: ["read"],
      },
    });

    keyToDelete = key.id;
  });

  test("should delete an API key", async () => {
    const request = createRequest(
      `http://localhost:3000/api/v1/api-keys/${keyToDelete}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${testApiKey}`,
        },
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ keyId: keyToDelete }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("api_key");

    const deletedKey = await prisma.apiKey.findUnique({
      where: { id: keyToDelete },
    });
    expect(deletedKey).toBeNull();
  });

  test("should reject deleting currently-used API key", async () => {
    const request = createRequest(
      `http://localhost:3000/api/v1/api-keys/${testApiKeyId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${testApiKey}`,
        },
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ keyId: testApiKeyId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("currently being used");
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject deleting non-existent API key", async () => {
    const fakeKeyId = randomUUID();
    const request = createRequest(
      `http://localhost:3000/api/v1/api-keys/${fakeKeyId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${testApiKey}`,
        },
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ keyId: fakeKeyId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("Could not find api key.");
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject deleting API key from different workspace", async () => {
    const otherWorkspaceId = randomUUID();
    const otherKey = await prisma.apiKey.create({
      data: {
        workspaceId: otherWorkspaceId,
        name: "Other Workspace Key",
        keyHash: hashApiKey(generateApiKey().key),
        keyPreview: "sk_other...",
        scopes: ["read"],
      },
    });

    const request = createRequest(
      `http://localhost:3000/api/v1/api-keys/${otherKey.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${testApiKey}`,
        },
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ keyId: otherKey.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("Could not find api key.");
    expect(responseData.error.requestId).toBeDefined();

    await prisma.apiKey.delete({ where: { id: otherKey.id } });
  });

  test("should reject request with missing Authorization header", async () => {
    const request = createRequest(
      `http://localhost:3000/api/v1/api-keys/${keyToDelete}`,
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ keyId: keyToDelete }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});
