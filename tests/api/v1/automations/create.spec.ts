/**
 * Integration tests for Automation Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/automations - Create new automation
 */

import { POST } from "@/app/api/v1/automations/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Setup: Create a test workspace and API keys for authentication
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

describe("POST /api/v1/automations", () => {
  test("should create a new automation with valid data", async () => {
    const automationData = {
      name: "Welcome Email Sequence",
      description: "Send welcome emails to new subscribers",
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
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 100 },
          data: {
            subject: "Welcome!",
            templateId: "tpl_123",
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

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("automation");
    expect(responseData.id).toBeDefined();
  });

  test("should create automation with percentage split", async () => {
    const automationData = {
      name: "A/B Test Email",
      trigger: {
        type: "SEGMENT_ENTRY",
        config: {},
      },
      nodes: [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "split-1",
          type: "percentage-split",
          position: { x: 0, y: 100 },
          data: {
            splits: [
              { id: "branch-a", name: "A", percentage: 50 },
              { id: "branch-b", name: "B", percentage: 50 },
            ],
          },
        },
      ],
      edges: [
        {
          id: "e1-2",
          source: "trigger-1",
          target: "split-1",
        },
      ],
    };

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("automation");
    expect(responseData.id).toBeDefined();
  });

  test("should create automation with if/else condition", async () => {
    const automationData = {
      name: "Conditional Email",
      trigger: {
        type: "PROPERTY_UPDATED",
        config: {},
      },
      nodes: [
        {
          id: "trigger-1",
          type: "contact-property-updated",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "condition-1",
          type: "if-else",
          position: { x: 0, y: 100 },
          data: {
            conditions: {
              field: "totalPurchases",
              operator: "gt",
              value: 5,
            },
          },
        },
      ],
      edges: [
        {
          id: "e1-2",
          source: "trigger-1",
          target: "condition-1",
        },
      ],
    };

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should create automation with time delay", async () => {
    const automationData = {
      name: "Delayed Welcome",
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
      edges: [
        {
          id: "e1-2",
          source: "trigger-1",
          target: "delay-1",
        },
      ],
    };

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should reject automation without trigger node", async () => {
    const automationData = {
      name: "Invalid Automation",
      trigger: {
        type: "CONTACT_SUBSCRIBED",
        config: {},
      },
      nodes: [
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 0 },
          data: {},
        },
      ],
      edges: [],
    };

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
    expect(responseData.fieldErrors).toBeDefined();
  });

  test("should reject automation with invalid percentage split", async () => {
    const automationData = {
      name: "Invalid Split",
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
        {
          id: "split-1",
          type: "percentage-split",
          position: { x: 0, y: 100 },
          data: {
            splits: [
              { id: "branch-a", name: "A", percentage: 60 },
              { id: "branch-b", name: "B", percentage: 60 },
            ],
          },
        },
      ],
      edges: [],
    };

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject automation with edges referencing non-existent nodes", async () => {
    const automationData = {
      name: "Invalid Edges",
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
      edges: [
        {
          id: "e1-2",
          source: "trigger-1",
          target: "non-existent-node",
        },
      ],
    };

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject automation with empty name", async () => {
    const automationData = {
      name: "",
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

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject request with missing Authorization header", async () => {
    const automationData = {
      name: "Test Automation",
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

    const request = apiRequest("/automations")
      .method("POST")
      .body(automationData)
      .build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Authorization header");
  });

  test("should reject request without write:automations scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:automations"],
    });

    const automationData = {
      name: "Test Automation",
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

    const request = post("/automations", automationData, readOnlyKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("scope");
  });
});
