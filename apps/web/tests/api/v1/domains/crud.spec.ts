/**
 * Integration tests for Individual Sending Domain Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/domains/[domainId] - Get specific domain
 * - PUT /api/v1/domains/[domainId] - Update specific domain
 * - DELETE /api/v1/domains/[domainId] - Delete specific domain
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DELETE, GET, PUT } from "@/app/api/v1/domains/[domainId]/route";
import { POST } from "@/app/api/v1/domains/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  del,
  get,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test sending domain
 */
async function createTestDomain(apiKey: CreatedApiKey, name: string) {
  const domainData = { name };
  const request = post("/domains", domainData, apiKey.key);
  const response = await POST(request);
  return await response.json();
}

/**
 * Setup: Create a test workspace and API key
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/domains/[domainId]", () => {
  test("should retrieve a domain by ID", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "get-test.example.com",
    );
    const request = get(`/domains/${createdDomain.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("sending_domain");
    expect(responseData.id).toBe(createdDomain.id);
    expect(responseData.name).toBe("get-test.example.com");
    expect(responseData.dkimVerified).toBeDefined();
    expect(responseData.returnPathVerified).toBeDefined();
    expect(responseData.trackingVerified).toBeDefined();
    expect(responseData.dnsRecords).toBeDefined();
  });

  test("should return 404 for non-existent domain", async () => {
    const request = get("/domains/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ domainId: "non_existent_id" });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);
  });

  test("should not retrieve domain from different workspace", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "workspace-test.example.com",
    );

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = get(`/domains/${createdDomain.id}`, otherApiKey.key);
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:domains scope", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "scope-get-test.example.com",
    );
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:domains"],
    });

    const request = get(`/domains/${createdDomain.id}`, writeOnlyApiKey.key);
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });
});

describe("PUT /api/v1/domains/[domainId]", () => {
  test("should update openTrackingEnabled", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "update-open-tracking.example.com",
    );
    const updateData = { openTrackingEnabled: true };
    const request = put(
      `/domains/${createdDomain.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("sending_domain");
    expect(responseData.openTrackingEnabled).toBe(true);
  });

  test("should update clickTrackingEnabled", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "update-click-tracking.example.com",
    );
    const updateData = { clickTrackingEnabled: true };
    const request = put(
      `/domains/${createdDomain.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("sending_domain");
    expect(responseData.clickTrackingEnabled).toBe(true);
  });

  test("should update both tracking settings at once", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "update-both-tracking.example.com",
    );
    const updateData = {
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
    };
    const request = put(
      `/domains/${createdDomain.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.openTrackingEnabled).toBe(true);
    expect(responseData.clickTrackingEnabled).toBe(true);
  });

  test("should disable tracking settings", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "disable-tracking.example.com",
    );

    // First enable tracking
    const enableRequest = put(
      `/domains/${createdDomain.id}`,
      { openTrackingEnabled: true, clickTrackingEnabled: true },
      fullAccessApiKey.key,
    );
    await PUT(enableRequest, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });

    // Then disable
    const disableRequest = put(
      `/domains/${createdDomain.id}`,
      { openTrackingEnabled: false, clickTrackingEnabled: false },
      fullAccessApiKey.key,
    );
    const response = await PUT(disableRequest, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.openTrackingEnabled).toBe(false);
    expect(responseData.clickTrackingEnabled).toBe(false);
  });

  test("should reject update without update:domains scope", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "scope-update-test.example.com",
    );
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:domains"],
    });

    const updateData = { openTrackingEnabled: true };
    const request = put(
      `/domains/${createdDomain.id}`,
      updateData,
      readOnlyApiKey.key,
    );
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should return 404 when updating non-existent domain", async () => {
    const updateData = { openTrackingEnabled: true };
    const request = put(
      "/domains/non_existent_id",
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ domainId: "non_existent_id" });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);
  });

  test("should not update domain from different workspace", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "workspace-update-test.example.com",
    );

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const updateData = { openTrackingEnabled: true };
    const request = put(
      `/domains/${createdDomain.id}`,
      updateData,
      otherApiKey.key,
    );
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);

    await cleanupWorkspace(otherWorkspace.id);
  });
});

describe("DELETE /api/v1/domains/[domainId]", () => {
  test("should delete a domain", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "delete-test.example.com",
    );
    const request = del(`/domains/${createdDomain.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("sending_domain");
    expect(responseData.id).toBe(createdDomain.id);

    // Verify domain is actually deleted
    const getRequest = get(
      `/domains/${createdDomain.id}`,
      fullAccessApiKey.key,
    );
    const getParams = Promise.resolve({ domainId: createdDomain.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(404);
  });

  test("should return 404 when deleting non-existent domain", async () => {
    const request = del("/domains/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ domainId: "non_existent_id" });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);
  });

  test("should reject delete without delete:domains scope", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "scope-delete-test.example.com",
    );
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:domains"],
    });

    const request = del(`/domains/${createdDomain.id}`, readOnlyApiKey.key);
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should not delete domain from different workspace", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "workspace-delete-test.example.com",
    );

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = del(`/domains/${createdDomain.id}`, otherApiKey.key);
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);

    // Verify original domain still exists
    const getRequest = get(
      `/domains/${createdDomain.id}`,
      fullAccessApiKey.key,
    );
    const getParams = Promise.resolve({ domainId: createdDomain.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(200);

    await cleanupWorkspace(otherWorkspace.id);
  });
});
