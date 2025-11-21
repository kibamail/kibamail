/**
 * Integration tests for Individual Automation Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/automations/[automationId] - Get specific automation
 * - PUT /api/v1/automations/[automationId] - Update specific automation
 * - DELETE /api/v1/automations/[automationId] - Delete specific automation
 */

import {
  GET,
  PUT,
  DELETE,
} from "@/app/api/v1/automations/[automationId]/route";
import { POST } from "@/app/api/v1/automations/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  get,
  put,
  del,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test automation
 */
async function createTestAutomation(
  apiKey: CreatedApiKey,
  name: string,
  status: "DRAFT" | "PUBLISHED" = "DRAFT"
) {
  const automationData = {
    name,
    trigger: {
      type: "CONTACT_SUBSCRIBED",
      config: {},
    },
    nodes: [
      {
        id: "trigger-1",
        type: "contact-subscribed",
        position: { x: 0, y: 0 },
        data: {},
      },
    ],
    edges: [],
  };

  const request = post("/automations", automationData, apiKey.key);
  const response = await POST(request);
  const data = await response.json();

  // If status should be PUBLISHED, we'd need to publish it
  // For now, all created automations are DRAFT by default

  return data;
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

describe("GET /api/v1/automations/[automationId]", () => {
  test("should retrieve an automation by ID", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Retrieve Test"
    );
    const request = get(
      `/automations/${createdAutomation.id}`,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation");
    expect(responseData.id).toBe(createdAutomation.id);
    expect(responseData.name).toBe("Retrieve Test");
    expect(responseData.status).toBe("DRAFT");
    expect(responseData.version).toBe(1);
    expect(responseData.nodes).toBeDefined();
    expect(responseData.edges).toBeDefined();
  });

  test("should return 404 for non-existent automation", async () => {
    const request = get("/automations/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: "non_existent_id" });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("not found");
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should not retrieve automation from different workspace", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Workspace Test"
    );

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = get(
      `/automations/${createdAutomation.id}`,
      otherApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:automations scope", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Scope Test"
    );
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:automations"],
    });

    const request = get(
      `/automations/${createdAutomation.id}`,
      writeOnlyApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("PUT /api/v1/automations/[automationId]", () => {
  test("should update automation name", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Original Name"
    );
    const updateData = { name: "Updated Name" };
    const request = put(
      `/automations/${createdAutomation.id}`,
      updateData,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation");
    expect(responseData.id).toBe(createdAutomation.id);
  });

  test("should update automation nodes", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Update Nodes Test"
    );
    const updateData = {
      nodes: [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 100 },
          data: {
            subject: "Welcome!",
          },
        },
      ],
      edges: [
        {
          id: "e1-2",
          source: "trigger-1",
          target: "email-1",
        },
      ],
    };
    const request = put(
      `/automations/${createdAutomation.id}`,
      updateData,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should update automation description", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Description Test"
    );
    const updateData = { description: "New description" };
    const request = put(
      `/automations/${createdAutomation.id}`,
      updateData,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should update multiple fields at once", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Multi Update Test"
    );
    const updateData = {
      name: "Updated Multi",
      description: "Updated description",
      nodes: [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "delay-1",
          type: "time-delay",
          position: { x: 0, y: 100 },
          data: {
            duration: 24,
            unit: "hours",
          },
        },
      ],
    };
    const request = put(
      `/automations/${createdAutomation.id}`,
      updateData,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should reject update without write:automations scope", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Scope Update Test"
    );
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:automations"],
    });

    const updateData = { name: "Should Fail" };
    const request = put(
      `/automations/${createdAutomation.id}`,
      updateData,
      readOnlyApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should return 404 when updating non-existent automation", async () => {
    const updateData = { name: "Does Not Exist" };
    const request = put(
      "/automations/non_existent_id",
      updateData,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: "non_existent_id" });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("DELETE /api/v1/automations/[automationId]", () => {
  test("should delete a DRAFT automation", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Automation to Delete"
    );
    const request = del(
      `/automations/${createdAutomation.id}`,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation");
    expect(responseData.id).toBe(createdAutomation.id);

    // Verify automation is soft-deleted
    const getRequest = get(
      `/automations/${createdAutomation.id}`,
      fullAccessApiKey.key
    );
    const getParams = Promise.resolve({ automationId: createdAutomation.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(404);
  });

  test("should return 404 when deleting non-existent automation", async () => {
    const request = del("/automations/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: "non_existent_id" });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject delete without delete:automations scope", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Scope Delete Test"
    );
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:automations"],
    });

    const request = del(
      `/automations/${createdAutomation.id}`,
      readOnlyApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should not delete automation from different workspace", async () => {
    const createdAutomation = await createTestAutomation(
      fullAccessApiKey,
      "Workspace Delete Test"
    );

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = del(
      `/automations/${createdAutomation.id}`,
      otherApiKey.key
    );
    const params = Promise.resolve({ automationId: createdAutomation.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");

    // Verify original automation still exists
    const getRequest = get(
      `/automations/${createdAutomation.id}`,
      fullAccessApiKey.key
    );
    const getParams = Promise.resolve({ automationId: createdAutomation.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(200);

    await cleanupWorkspace(otherWorkspace.id);
  });
});
