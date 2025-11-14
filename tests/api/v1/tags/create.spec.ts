/**
 * Integration tests for Tag Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/tags - Create new tag
 */

import { POST } from "@/app/api/v1/tags/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;

/**
 * Setup: Create a test workspace and API keys for authentication
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/tags", () => {
  test("should create a new tag with valid authentication and required fields", async () => {
    const tagData = {
      name: "VIP Customer",
    };
    const request = post("/tags", tagData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("tag");
    expect(responseData.id).toBeDefined();
  });

  test("should create a tag with custom color", async () => {
    const tagData = {
      name: "Premium",
      color: "#FF5733",
    };
    const request = post("/tags", tagData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("tag");
    expect(responseData.id).toBeDefined();
  });

  test("should reject duplicate tag name in same workspace", async () => {
    const tagData = {
      name: "Duplicate Tag",
    };

    const firstRequest = post("/tags", tagData, fullAccessApiKey.key);
    await POST(firstRequest);

    const duplicateRequest = post("/tags", tagData, fullAccessApiKey.key);
    const response = await POST(duplicateRequest);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("already exists");
  });

  test("should allow same tag name in different workspaces", async () => {
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const tagData = {
      name: "Shared Name",
    };

    const firstRequest = post("/tags", tagData, fullAccessApiKey.key);
    const firstResponse = await POST(firstRequest);
    expect(firstResponse.status).toBe(201);

    const secondRequest = post("/tags", tagData, otherApiKey.key);
    const secondResponse = await POST(secondRequest);
    expect(secondResponse.status).toBe(201);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request with missing Authorization header", async () => {
    const tagData = { name: "Test Tag" };
    const request = apiRequest("/tags").method("POST").body(tagData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Authorization header");
  });

  test("should reject request without write:tags scope", async () => {
    const writeOnlyContactsKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:contacts"], // Missing write:tags
    });

    const tagData = { name: "Test Tag" };
    const request = post("/tags", tagData, writeOnlyContactsKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("scope");
  });

  test("should reject tag with empty name", async () => {
    const tagData = {
      name: "",
    };
    const request = post("/tags", tagData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject tag with name exceeding max length", async () => {
    const tagData = {
      name: "A".repeat(51), // Exceeds 50 character limit
    };
    const request = post("/tags", tagData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject tag with invalid color format", async () => {
    const tagData = {
      name: "Test Tag",
      color: "invalid-color",
    };
    const request = post("/tags", tagData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should trim whitespace from tag name", async () => {
    const tagData = {
      name: "  Trimmed Tag  ",
    };
    const request = post("/tags", tagData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });
});
