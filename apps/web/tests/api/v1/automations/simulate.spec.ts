import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "@/app/(main)/api/v1/automations/[automationId]/simulate/route";
import { prisma } from "@/lib/db";
import type { FlowNode, FlowEdge } from "@/lib/automations/graph";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  createTestContacts,
  createTestTopics,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

function node(id: string, type: string, data: Record<string, unknown> = {}): FlowNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function edge(source: string, target: string, sourceHandle?: string): FlowEdge {
  return { id: `${source}->${target}`, source, target, sourceHandle: sourceHandle ?? null };
}

async function createAutomation(
  triggerType: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  triggerConfig: Record<string, unknown> = {},
) {
  return prisma.automation.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Test Automation",
      status: "DRAFT",
      triggerType: triggerType as never,
      triggerConfig: triggerConfig as never,
      nodes: nodes as never,
      edges: edges as never,
    },
  });
}

async function simulate(automationId: string, contactId: string, seed?: number) {
  const body: Record<string, unknown> = { contactId };
  if (seed !== undefined) body.seed = seed;
  const request = post(`/automations/${automationId}/simulate`, body, fullAccessApiKey.key);
  const params = Promise.resolve({ automationId });
  return POST(request, { params });
}

async function simulateVirtual(automationId: string, contact: Record<string, unknown>, seed?: number) {
  const body: Record<string, unknown> = { contact };
  if (seed !== undefined) body.seed = seed;
  const request = post(`/automations/${automationId}/simulate`, body, fullAccessApiKey.key);
  const params = Promise.resolve({ automationId });
  return POST(request, { params });
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  await prisma.automation.deleteMany({ where: { workspaceId: testWorkspace.id } });
  await prisma.contact.deleteMany({ where: { workspaceId: testWorkspace.id } });
});

describe("POST /api/v1/automations/:id/simulate", () => {
  test("simulates linear automation", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("a1", "send-email", { subject: "Welcome!" }),
    ], [
      edge("t1", "a1"),
    ]);

    await createTestContacts(testWorkspace.id, [{ email: "sim@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const response = await simulate(automation.id, contactId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.object).toBe("automation_simulation");
    expect(data.status).toBe("completed");
    expect(data.totalSteps).toBe(2);
    expect(data.steps[0].action).toBe("trigger");
    expect(data.steps[1].action).toBe("would_send_email");
    expect(data.steps[1].detail).toContain("Welcome!");
    expect(data.steps[1].detail).toContain("sim@test.com");
  });

  test("simulates IF_ELSE true branch", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("if1", "if-else", { conditions: { field: "status", operator: "eq", value: "SUBSCRIBED" } }),
      node("true-action", "send-email", { subject: "You are subscribed" }),
      node("false-action", "send-email", { subject: "Please subscribe" }),
    ], [
      edge("t1", "if1"),
      edge("if1", "true-action", "true"),
      edge("if1", "false-action", "false"),
    ]);

    await createTestContacts(testWorkspace.id, [{ email: "subscribed@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const response = await simulate(automation.id, contactId);
    const data = await response.json();

    expect(data.status).toBe("completed");
    expect(data.totalSteps).toBe(3);

    const ifStep = data.steps.find((s: Record<string, unknown>) => s.nodeType === "if-else");
    expect(ifStep.branch).toBe("true");
    expect(ifStep.detail).toContain("true");

    const emailStep = data.steps.find((s: Record<string, unknown>) => s.action === "would_send_email");
    expect(emailStep.detail).toContain("You are subscribed");
  });

  test("simulates IF_ELSE false branch", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("if1", "if-else", { conditions: { field: "status", operator: "eq", value: "BOUNCED" } }),
      node("true-action", "send-email", { subject: "Bounced path" }),
      node("false-action", "send-email", { subject: "Not bounced path" }),
    ], [
      edge("t1", "if1"),
      edge("if1", "true-action", "true"),
      edge("if1", "false-action", "false"),
    ]);

    await createTestContacts(testWorkspace.id, [{ email: "active@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const response = await simulate(automation.id, contactId);
    const data = await response.json();

    const ifStep = data.steps.find((s: Record<string, unknown>) => s.nodeType === "if-else");
    expect(ifStep.branch).toBe("false");

    const emailStep = data.steps.find((s: Record<string, unknown>) => s.action === "would_send_email");
    expect(emailStep.detail).toContain("Not bounced path");
  });

  test("simulates PERCENTAGE_SPLIT with seed for determinism", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("split", "percentage-split", {
        splits: [
          { id: "branch-a", name: "Path A", percentage: 50 },
          { id: "branch-b", name: "Path B", percentage: 50 },
        ],
      }),
      node("a1", "send-email", { subject: "Path A email" }),
      node("a2", "send-email", { subject: "Path B email" }),
    ], [
      edge("t1", "split"),
      edge("split", "a1", "branch-a"),
      edge("split", "a2", "branch-b"),
    ]);

    await createTestContacts(testWorkspace.id, [{ email: "split@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    // Same seed should produce same result
    const res1 = await simulate(automation.id, contactId, 42);
    const data1 = await res1.json();
    const res2 = await simulate(automation.id, contactId, 42);
    const data2 = await res2.json();

    const split1 = data1.steps.find((s: Record<string, unknown>) => s.nodeType === "percentage-split");
    const split2 = data2.steps.find((s: Record<string, unknown>) => s.nodeType === "percentage-split");
    expect(split1.branch).toBe(split2.branch);
  });

  test("simulates TIME_DELAY as skipped", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("delay", "time-delay", { duration: 3, unit: "days" }),
      node("a1", "send-email", { subject: "After delay" }),
    ], [
      edge("t1", "delay"),
      edge("delay", "a1"),
    ]);

    await createTestContacts(testWorkspace.id, [{ email: "delay@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const response = await simulate(automation.id, contactId);
    const data = await response.json();

    expect(data.status).toBe("completed");
    expect(data.totalSteps).toBe(3);

    const delayStep = data.steps.find((s: Record<string, unknown>) => s.action === "would_wait");
    expect(delayStep.detail).toContain("3 days");
    expect(delayStep.detail).toContain("skipped");
  });

  test("simulates ADD_TO_TOPIC with resolved topic name", { timeout: 15000 }, async () => {
    const topics = await createTestTopics(testWorkspace.id, [{ name: "Newsletter" }]);

    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("a1", "add-to-topic", { topicIds: [topics[0].id] }),
    ], [
      edge("t1", "a1"),
    ]);

    await createTestContacts(testWorkspace.id, [{ email: "topic@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const response = await simulate(automation.id, contactId);
    const data = await response.json();

    const topicStep = data.steps.find((s: Record<string, unknown>) => s.action === "would_add_to_topic");
    expect(topicStep.detail).toContain("Newsletter");
  });

  test("works on DRAFT automations", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("a1", "send-email", { subject: "Draft test" }),
    ], [
      edge("t1", "a1"),
    ]);

    expect(automation.status).toBe("DRAFT");

    await createTestContacts(testWorkspace.id, [{ email: "draft@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const response = await simulate(automation.id, contactId);
    expect(response.status).toBe(200);
  });

  test("returns error for non-existent contact", { timeout: 10000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
    ], []);

    const response = await simulate(automation.id, "nonexistent-id");
    expect(response.status).toBe(400);
  });

  test("returns error for non-existent automation", { timeout: 10000 }, async () => {
    await createTestContacts(testWorkspace.id, [{ email: "noauto@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const response = await simulate("nonexistent-id", contactId);
    expect(response.status).toBe(404);
  });

  // Virtual contact tests
  test("simulates with virtual contact", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("a1", "send-email", { subject: "Hello virtual!" }),
    ], [
      edge("t1", "a1"),
    ]);

    const response = await simulateVirtual(automation.id, {
      email: "virtual@test.com",
      firstName: "Virtual",
      status: "SUBSCRIBED",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("completed");
    expect(data.contactEmail).toBe("virtual@test.com");
    expect(data.steps[1].detail).toContain("virtual@test.com");
  });

  test("virtual contact evaluates IF_ELSE with correct status", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("if1", "if-else", { conditions: { field: "status", operator: "eq", value: "BOUNCED" } }),
      node("true-action", "send-email", { subject: "Bounced path" }),
      node("false-action", "send-email", { subject: "Not bounced" }),
    ], [
      edge("t1", "if1"),
      edge("if1", "true-action", "true"),
      edge("if1", "false-action", "false"),
    ]);

    // Virtual contact with BOUNCED → true branch
    const res1 = await simulateVirtual(automation.id, { email: "v1@test.com", status: "BOUNCED" });
    const data1 = await res1.json();
    const if1 = data1.steps.find((s: Record<string, unknown>) => s.nodeType === "if-else");
    expect(if1.branch).toBe("true");

    // Virtual contact with SUBSCRIBED → false branch
    const res2 = await simulateVirtual(automation.id, { email: "v2@test.com", status: "SUBSCRIBED" });
    const data2 = await res2.json();
    const if2 = data2.steps.find((s: Record<string, unknown>) => s.nodeType === "if-else");
    expect(if2.branch).toBe("false");
  });

  test("virtual contact with invalid topic ID errors", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("a1", "send-email", { subject: "Test" }),
    ], [
      edge("t1", "a1"),
    ]);

    const response = await simulateVirtual(automation.id, {
      email: "v@test.com",
      topics: ["nonexistent-topic-id"],
    });
    expect(response.status).toBe(400);
  });

  test("virtual contact not persisted after simulation", { timeout: 15000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
      node("a1", "send-email", { subject: "Ephemeral" }),
    ], [
      edge("t1", "a1"),
    ]);

    const response = await simulateVirtual(automation.id, {
      email: "ephemeral-unique-12345@test.com",
      status: "SUBSCRIBED",
    });
    expect(response.status).toBe(200);

    const found = await prisma.contact.findFirst({
      where: { email: "ephemeral-unique-12345@test.com", workspaceId: testWorkspace.id },
    });
    expect(found).toBeNull();
  });

  test("rejects when both contactId and contact provided", { timeout: 10000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
    ], []);

    await createTestContacts(testWorkspace.id, [{ email: "both@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const body = { contactId, contact: { email: "virtual@test.com" } };
    const request = post(`/automations/${automation.id}/simulate`, body, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });
    expect(response.status).toBe(422);
  });

  test("rejects when neither contactId nor contact provided", { timeout: 10000 }, async () => {
    const automation = await createAutomation("CONTACT_SUBSCRIBED", [
      node("t1", "contact-subscribed"),
    ], []);

    const body = { seed: 42 };
    const request = post(`/automations/${automation.id}/simulate`, body, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });
    expect(response.status).toBe(422);
  });
});
