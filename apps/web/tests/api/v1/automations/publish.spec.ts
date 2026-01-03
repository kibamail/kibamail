import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as PUBLISH_POST } from "@/app/(main)/api/v1/automations/[automationId]/publish/route";
import { PUT } from "@/app/(main)/api/v1/automations/[automationId]/route";
import { POST as CREATE_POST } from "@/app/(main)/api/v1/automations/route";
import { ErrorCode } from "@/lib/api/error-codes";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

async function createAutomation(
  apiKey: CreatedApiKey,
  name: string,
  nodes: unknown[] = [],
  edges: unknown[] = [],
) {
  const automationData = {
    name,
    trigger: { type: "CONTACT_SUBSCRIBED", config: {} },
    nodes:
      nodes.length > 0
        ? nodes
        : [
            {
              id: "trigger-1",
              type: "contact-subscribed",
              position: { x: 0, y: 0 },
              data: {},
            },
          ],
    edges,
  };

  const request = post("/automations", automationData, apiKey.key);
  const response = await CREATE_POST(request);
  return response.json();
}

async function updateAutomation(
  apiKey: CreatedApiKey,
  automationId: string,
  nodes: unknown[],
  edges: unknown[] = [],
) {
  const request = put(
    `/automations/${automationId}`,
    { nodes, edges },
    apiKey.key,
  );
  const params = Promise.resolve({ automationId });
  const response = await PUT(request, { params });
  return response.json();
}

async function publishAutomation(apiKey: CreatedApiKey, automationId: string) {
  const request = post(`/automations/${automationId}/publish`, {}, apiKey.key);
  const params = Promise.resolve({ automationId });
  const response = await PUBLISH_POST(request, { params });
  return { response, data: await response.json() };
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/automations/[automationId]/publish - Flow Structure Validation", () => {
  test("should publish automation with valid trigger node", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Valid Trigger",
    );
    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject automation with no nodes", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "No Nodes Test",
    );
    await updateAutomation(fullAccessApiKey, automation.id, [], []);

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        field: "nodes",
        message: expect.stringContaining("at least one node"),
      }),
    );
  });

  test("should reject automation with no trigger node", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "No Trigger Test",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 0 },
          data: { subject: "Test" },
        },
      ],
      [],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        field: "trigger",
        message: expect.stringContaining("trigger node"),
      }),
    );
  });

  test("should reject automation with multiple trigger nodes", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Multiple Triggers Test",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "trigger-2",
          type: "form-filled",
          position: { x: 200, y: 0 },
          data: { formId: "form-123" },
        },
      ],
      [],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        field: "trigger",
        message: expect.stringContaining("only have one trigger"),
      }),
    );
  });

  test("should reject automation with orphan nodes", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Orphan Node Test",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "orphan-email",
          type: "send-email",
          position: { x: 200, y: 0 },
          data: { subject: "Orphan" },
        },
      ],
      [], // No edges - email node is orphaned
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "orphan-email",
        field: "edges",
        message: expect.stringContaining("not connected"),
      }),
    );
  });
});

describe("POST /api/v1/automations/[automationId]/publish - Trigger Node Validation", () => {
  test("should publish with valid contact-subscribed trigger (no config required)", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Contact Subscribed Test",
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject property-updated trigger without propertyName", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Property Updated Test",
      [
        {
          id: "trigger-1",
          type: "contact-property-updated",
          position: { x: 0, y: 0 },
          data: {}, // Missing propertyName
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "propertyName",
        message: expect.stringContaining("Property name is required"),
      }),
    );
  });

  test("should publish with valid property-updated trigger", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Property Updated Valid",
      [
        {
          id: "trigger-1",
          type: "contact-property-updated",
          position: { x: 0, y: 0 },
          data: { propertyName: "custom_field" },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject form-filled trigger without formId", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Form Filled Test",
      [
        {
          id: "trigger-1",
          type: "form-filled",
          position: { x: 0, y: 0 },
          data: {}, // Missing formId
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "formId",
        message: expect.stringContaining("Form selection is required"),
      }),
    );
  });

  test("should reject event trigger without eventName", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Event Trigger Test",
      [
        {
          id: "trigger-1",
          type: "event",
          position: { x: 0, y: 0 },
          data: {}, // Missing eventName
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "eventName",
        message: expect.stringContaining("Event name is required"),
      }),
    );
  });

  test("should reject segment-entry trigger without segmentId", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Segment Entry Test",
      [
        {
          id: "trigger-1",
          type: "segment-entry",
          position: { x: 0, y: 0 },
          data: {}, // Missing segmentId
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "segmentId",
        message: expect.stringContaining("Segment selection is required"),
      }),
    );
  });

  test("should reject segment-exit trigger without segmentId", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Segment Exit Test",
      [
        {
          id: "trigger-1",
          type: "segment-exit",
          position: { x: 0, y: 0 },
          data: {}, // Missing segmentId
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "segmentId",
      }),
    );
  });

  test("should reject email-engagement trigger without emailEngagementType", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Email Engagement Test",
      [
        {
          id: "trigger-1",
          type: "email-engagement",
          position: { x: 0, y: 0 },
          data: {}, // Missing emailEngagementType
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "emailEngagementType",
        message: expect.stringContaining("Engagement type"),
      }),
    );
  });

  test("should reject email-engagement trigger with invalid emailEngagementType", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Invalid Engagement Type",
      [
        {
          id: "trigger-1",
          type: "email-engagement",
          position: { x: 0, y: 0 },
          data: { emailEngagementType: "invalid" },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "emailEngagementType",
        message: expect.stringContaining("open, click, bounce, spam"),
      }),
    );
  });
});

describe("POST /api/v1/automations/[automationId]/publish - Trigger Conditions Validation", () => {
  test("should publish trigger without conditions (conditions are optional)", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Trigger No Conditions",
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {}, // No conditions
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should publish trigger with valid field condition", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Trigger Valid Field Condition",
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {
            conditions: {
              field: "email",
              operator: "contains",
              value: "@company.com",
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should publish trigger with valid $and conditions", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Trigger Valid And Conditions",
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {
            conditions: {
              $and: [
                { field: "email", operator: "contains", value: "@company.com" },
                { field: "firstName", operator: "eq", value: "John" },
              ],
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should publish trigger with valid topic condition", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Trigger Valid Topic Condition",
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {
            conditions: {
              subscribedToTopic: ["topic-123"],
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject trigger with invalid conditions structure", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Trigger Invalid Conditions",
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {
            conditions: {
              invalidField: "bad-value", // Invalid structure
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "conditions",
        message: expect.stringContaining("Invalid trigger condition"),
      }),
    );
  });

  test("should reject trigger with invalid field operator", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Trigger Invalid Operator",
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {
            conditions: {
              field: "email",
              operator: "invalid-operator",
              value: "test",
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "conditions",
      }),
    );
  });

  test("should publish form-filled trigger with valid conditions", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Form Trigger With Conditions",
      [
        {
          id: "trigger-1",
          type: "form-filled",
          position: { x: 0, y: 0 },
          data: {
            formId: "form-123",
            conditions: {
              field: "email",
              operator: "endsWith",
              value: "@gmail.com",
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should publish event trigger with valid conditions", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Event Trigger With Conditions",
      [
        {
          id: "trigger-1",
          type: "event",
          position: { x: 0, y: 0 },
          data: {
            eventName: "purchase.completed",
            conditions: {
              $and: [
                {
                  field: "property.plan_type",
                  operator: "eq",
                  value: "premium",
                },
              ],
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should still require trigger-specific fields when conditions are provided", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Form Missing FormId With Conditions",
      [
        {
          id: "trigger-1",
          type: "form-filled",
          position: { x: 0, y: 0 },
          data: {
            // Missing formId
            conditions: {
              field: "email",
              operator: "contains",
              value: "@test.com",
            },
          },
        },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "trigger-1",
        field: "formId",
        message: expect.stringContaining("Form selection is required"),
      }),
    );
  });
});

describe("POST /api/v1/automations/[automationId]/publish - Action Node Validation", () => {
  test("should reject send-email without templateId or subject", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Send Email Test",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: {}, // Missing templateId and subject
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "email-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "email-1",
        field: "templateId",
        message: expect.stringContaining("template or subject"),
      }),
    );
  });

  test("should publish send-email with subject only", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Send Email Subject",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { subject: "Welcome!" },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "email-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should publish send-email with templateId only", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Send Email Template",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { templateId: "template-123" },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "email-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject send-email with invalid fromEmail", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Invalid From Email",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { subject: "Test", fromEmail: "not-an-email" },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "email-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "email-1",
        field: "fromEmail",
        message: expect.stringContaining("Invalid"),
      }),
    );
  });

  test("should reject send-webhook without url", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Webhook No URL",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "webhook-1",
          type: "send-webhook",
          position: { x: 0, y: 100 },
          data: {}, // Missing url
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "webhook-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "webhook-1",
        field: "url",
        message: expect.stringContaining("URL is required"),
      }),
    );
  });

  test("should reject send-webhook with invalid url", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Webhook Invalid URL",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "webhook-1",
          type: "send-webhook",
          position: { x: 0, y: 100 },
          data: { url: "not-a-url" },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "webhook-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "webhook-1",
        field: "url",
        message: expect.stringContaining("Invalid"),
      }),
    );
  });

  test("should publish send-webhook with valid url", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Webhook Valid URL",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "webhook-1",
          type: "send-webhook",
          position: { x: 0, y: 100 },
          data: { url: "https://example.com/webhook" },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "webhook-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject update-contact without fieldId and fieldValue", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Update Contact No Fields",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "update-1",
          type: "update-contact",
          position: { x: 0, y: 100 },
          data: {}, // Missing fieldId and fieldValue
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "update-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "update-1",
        field: "fieldId",
        message: expect.stringContaining("Field selection is required"),
      }),
    );
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "update-1",
        field: "fieldValue",
        message: expect.stringContaining("Field value is required"),
      }),
    );
  });

  test("should reject update-contact with fieldId but no fieldValue", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Update Contact No Value",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "update-1",
          type: "update-contact",
          position: { x: 0, y: 100 },
          data: { fieldId: "firstName" }, // Missing fieldValue
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "update-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "update-1",
        field: "fieldValue",
      }),
    );
  });

  test("should reject add-to-topic without topicIds", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Add Topic No ID",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "topic-1",
          type: "add-to-topic",
          position: { x: 0, y: 100 },
          data: {}, // Missing topicIds
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "topic-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "topic-1",
        field: "topicIds",
        message: expect.stringContaining("topic selection is required"),
      }),
    );
  });

  test("should reject add-to-topic with empty topicIds array", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Add Topic Empty",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "topic-1",
          type: "add-to-topic",
          position: { x: 0, y: 100 },
          data: { topicIds: [] }, // Empty array
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "topic-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "topic-1",
        field: "topicIds",
      }),
    );
  });

  test("should reject remove-from-topic without topicIds", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Remove Topic No ID",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "topic-1",
          type: "remove-from-topic",
          position: { x: 0, y: 100 },
          data: {}, // Missing topicIds
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "topic-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "topic-1",
        field: "topicIds",
      }),
    );
  });

  test("should publish unsubscribe-contact without config (no required fields)", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Unsubscribe Valid",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "unsub-1",
          type: "unsubscribe-contact",
          position: { x: 0, y: 100 },
          data: {},
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "unsub-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });
});

describe("POST /api/v1/automations/[automationId]/publish - Rule Node Validation", () => {
  test("should reject if-else without conditions", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "If-Else No Conditions",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "if-else-1",
          type: "if-else",
          position: { x: 0, y: 100 },
          data: {}, // Missing conditions
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "if-else-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "if-else-1",
        field: "conditions",
        message: expect.stringContaining("Conditions are required"),
      }),
    );
  });

  test("should publish if-else with valid conditions", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "If-Else Valid",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "if-else-1",
          type: "if-else",
          position: { x: 0, y: 100 },
          data: {
            conditions: {
              field: "email",
              operator: "contains",
              value: "@gmail.com",
            },
          },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "if-else-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject percentage-split without splits", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Split No Config",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: {}, // Missing splits
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "split-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "split-1",
        field: "splits",
        message: expect.stringContaining("Split configuration is required"),
      }),
    );
  });

  test("should reject percentage-split with wrong number of branches", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Split Wrong Branches",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
            splits: [{ id: "a", name: "Branch A", percentage: 100 }], // Only 1 branch
          },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "split-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "split-1",
        field: "splits",
        message: expect.stringContaining("exactly 2 branches"),
      }),
    );
  });

  test("should reject percentage-split with percentages not totaling 100", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Split Wrong Total",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
              { id: "a", name: "Branch A", percentage: 40 },
              { id: "b", name: "Branch B", percentage: 40 }, // Total is 80, not 100
            ],
          },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "split-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "split-1",
        field: "splits",
        message: expect.stringContaining("total 100%"),
      }),
    );
  });

  test("should publish percentage-split with valid config", async () => {
    const automation = await createAutomation(fullAccessApiKey, "Split Valid");
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
              { id: "a", name: "Branch A", percentage: 50 },
              { id: "b", name: "Branch B", percentage: 50 },
            ],
          },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "split-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });

  test("should reject time-delay without duration", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Delay No Duration",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { unit: "hours" }, // Missing duration
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "delay-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "delay-1",
        field: "duration",
        message: expect.stringContaining("duration is required"),
      }),
    );
  });

  test("should reject time-delay without unit", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Delay No Unit",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { duration: 24 }, // Missing unit
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "delay-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "delay-1",
        field: "unit",
        message: expect.stringContaining("unit is required"),
      }),
    );
  });

  test("should reject time-delay with invalid unit", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Delay Invalid Unit",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { duration: 24, unit: "weeks" }, // Invalid unit
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "delay-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "delay-1",
        field: "unit",
        message: expect.stringContaining("seconds, minutes, hours, days"),
      }),
    );
  });

  test("should reject time-delay with zero duration", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Delay Zero Duration",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { duration: 0, unit: "hours" },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "delay-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.details.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "delay-1",
        field: "duration",
        message: expect.stringContaining("positive"),
      }),
    );
  });

  test("should publish time-delay with valid config", async () => {
    const automation = await createAutomation(fullAccessApiKey, "Delay Valid");
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { duration: 24, unit: "hours" },
        },
      ],
      [{ id: "e1", source: "trigger-1", target: "delay-1" }],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
  });
});

describe("POST /api/v1/automations/[automationId]/publish - Multiple Errors", () => {
  test("should return all validation errors at once", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Multiple Errors",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
        {
          id: "trigger-1",
          type: "form-filled",
          position: { x: 0, y: 0 },
          data: {}, // Missing formId
        },
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 100 },
          data: {}, // Missing subject/templateId
        },
        {
          id: "webhook-1",
          type: "send-webhook",
          position: { x: 0, y: 200 },
          data: {}, // Missing url
        },
      ],
      [
        { id: "e1", source: "trigger-1", target: "email-1" },
        { id: "e2", source: "email-1", target: "webhook-1" },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ErrorCode.AUTOMATION_VALIDATION_FAILED);
    expect(data.error.details.errors.length).toBeGreaterThanOrEqual(3);

    // Check all errors are present
    const errors = data.error.details.errors;
    expect(errors).toContainEqual(
      expect.objectContaining({ nodeId: "trigger-1", field: "formId" }),
    );
    expect(errors).toContainEqual(
      expect.objectContaining({ nodeId: "email-1", field: "templateId" }),
    );
    expect(errors).toContainEqual(
      expect.objectContaining({ nodeId: "webhook-1", field: "url" }),
    );
  });
});

describe("POST /api/v1/automations/[automationId]/publish - Complex Flows", () => {
  test("should publish a complete valid automation flow", async () => {
    const automation = await createAutomation(
      fullAccessApiKey,
      "Complete Flow",
    );
    await updateAutomation(
      fullAccessApiKey,
      automation.id,
      [
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
          data: { duration: 1, unit: "days" },
        },
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 200 },
          data: { subject: "Welcome!", templateId: "welcome-template" },
        },
        {
          id: "split-1",
          type: "percentage-split",
          position: { x: 0, y: 300 },
          data: {
            splits: [
              { id: "a", name: "Group A", percentage: 50 },
              { id: "b", name: "Group B", percentage: 50 },
            ],
          },
        },
      ],
      [
        { id: "e1", source: "trigger-1", target: "delay-1" },
        { id: "e2", source: "delay-1", target: "email-1" },
        { id: "e3", source: "email-1", target: "split-1" },
      ],
    );

    const { response, data } = await publishAutomation(
      fullAccessApiKey,
      automation.id,
    );

    expect(response.status).toBe(200);
    expect(data.status).toBe("PUBLISHED");
    expect(data.publishedAt).toBeDefined();
  });
});
