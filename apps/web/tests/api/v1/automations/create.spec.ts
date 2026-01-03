import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST } from "@/app/(main)/api/v1/automations/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import {
  apiRequest,
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

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

  test("should create automation without trigger node (uses action nodes only)", async () => {
    const automationData = {
      name: "Action-Only Automation",
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

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("automation");
    expect(responseData.name).toBe("Action-Only Automation");
    expect(responseData.nodes).toHaveLength(1);
    expect(responseData.nodes[0].type).toBe("send-email");
  });

  test("should create automation with default trigger node when no nodes provided", async () => {
    const automationData = {
      name: "Minimal Automation",
    };

    const request = post("/automations", automationData, fullAccessApiKey.key);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("automation");
    expect(responseData.name).toBe("Minimal Automation");
    expect(responseData.trigger.type).toBe("CONTACT_SUBSCRIBED");
    expect(responseData.nodes).toHaveLength(1);
    expect(responseData.nodes[0].type).toBe("contact-subscribed");
  });

  test("should allow creating automation with invalid percentage split (validation at publish)", async () => {
    // Create/update operations are lenient - strict validation happens at publish time.
    // This allows users to save work-in-progress automations with incomplete data.
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

    // Create succeeds - validation happens at publish time
    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
    expect(responseData.status).toBe("DRAFT");
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
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
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
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
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
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(
      ErrorCode.MISSING_AUTHORIZATION_HEADER,
    );
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
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
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});
