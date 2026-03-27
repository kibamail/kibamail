import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "@/app/(main)/api/v1/automations/[automationId]/trigger/route";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createTestWorkspace,
  createTestContacts,
  post,
  type TestWorkspace,
} from "@/tests/utils";

const { mockDispatchWebhook } = vi.hoisted(() => ({
  mockDispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/webhooks", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, dispatchWebhook: mockDispatchWebhook };
});

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;

async function createPublishedApiAutomation(workspaceId: string) {
  return prisma.automation.create({
    data: {
      workspaceId,
      name: "API Trigger Test",
      status: "PUBLISHED",
      triggerType: "API",
      triggerConfig: {},
      publishedAt: new Date(),
      nodes: [
        { id: "t1", type: "webhook-trigger", position: { x: 0, y: 0 }, data: {} },
        { id: "a1", type: "unsubscribe-contact", position: { x: 0, y: 100 }, data: {} },
      ] as never,
      edges: [
        { id: "e1", source: "t1", target: "a1" },
      ] as never,
    },
  });
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);
});

afterAll(async () => {
  const bullmqQueue = queue("automations").getQueue().getQueue();
  const allJobs = await bullmqQueue.getJobs(["waiting", "delayed", "active", "completed", "failed"]);
  await Promise.all(allJobs.map((j) => j.remove()));
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  mockDispatchWebhook.mockClear();
  await prisma.automationRun.deleteMany({ where: { workspaceId: testWorkspace.id } });
  await prisma.automation.deleteMany({ where: { workspaceId: testWorkspace.id } });
  await prisma.contact.deleteMany({ where: { workspaceId: testWorkspace.id } });
});

describe("POST /api/v1/automations/:id/trigger", () => {
  test("triggers API-type automation and returns 201", { timeout: 15000 }, async () => {
    const automation = await createPublishedApiAutomation(testWorkspace.id);
    await createTestContacts(testWorkspace.id, [{ email: "api-trigger@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    const contactId = contact?.id as string;
    const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.object).toBe("automation_run");
    expect(data.id).toBeDefined();
    expect(data.status).toBe("ACTIVE");
  });

  test("creates AutomationRun in database", { timeout: 15000 }, async () => {
    const automation = await createPublishedApiAutomation(testWorkspace.id);
    await createTestContacts(testWorkspace.id, [{ email: "api-run@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    const contactId = contact?.id as string;
    const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    await POST(request, { params });

    const run = await prisma.automationRun.findFirst({
      where: { automationId: automation.id, contactId },
    });
    expect(run).not.toBeNull();
    expect(run?.status).toBe("ACTIVE");
    expect(run?.pendingJobId).not.toBeNull();
  });

  test("returns 404 for non-existent automation", { timeout: 10000 }, async () => {
    await createTestContacts(testWorkspace.id, [{ email: "404@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    const contactId = contact?.id as string;
    const request = post("/automations/nonexistent/trigger", { contactId }, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: "nonexistent" });
    const response = await POST(request, { params });

    expect(response.status).toBe(404);
  });

  test("returns 400 for non-API trigger type", { timeout: 10000 }, async () => {
    const automation = await prisma.automation.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Non-API",
        status: "PUBLISHED",
        triggerType: "CONTACT_SUBSCRIBED",
        nodes: [] as never,
        edges: [] as never,
        publishedAt: new Date(),
      },
    });

    await createTestContacts(testWorkspace.id, [{ email: "non-api@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    const contactId = contact?.id as string;
    const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });

    expect(response.status).toBe(400);
  });

  test("returns 400 for DRAFT automation", { timeout: 10000 }, async () => {
    const automation = await prisma.automation.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Draft API",
        status: "DRAFT",
        triggerType: "API",
        nodes: [] as never,
        edges: [] as never,
      },
    });

    await createTestContacts(testWorkspace.id, [{ email: "draft-api@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    const contactId = contact?.id as string;
    const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });

    expect(response.status).toBe(400);
  });

  test("returns 409 when contact already has ACTIVE run", { timeout: 15000 }, async () => {
    const automation = await createPublishedApiAutomation(testWorkspace.id);
    await createTestContacts(testWorkspace.id, [{ email: "conflict@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    // Create an existing active run
    const contactId = contact?.id as string;
    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        contactId,
        workspaceId: testWorkspace.id,
        status: "ACTIVE",
        executionState: { completedNodes: [], branchDecisions: {} },
      },
    });

    const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });

    expect(response.status).toBe(409);
  });

  test("allows triggering when previous run is COMPLETED", { timeout: 15000 }, async () => {
    const automation = await createPublishedApiAutomation(testWorkspace.id);
    await createTestContacts(testWorkspace.id, [{ email: "re-trigger@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    // Create a completed run
    const contactId = contact?.id as string;
    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        contactId,
        workspaceId: testWorkspace.id,
        status: "COMPLETED",
        completedAt: new Date(),
        executionState: { completedNodes: ["a1"], branchDecisions: {} },
      },
    });

    const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });

    expect(response.status).toBe(201);
  });

  test("returns 401 with read-only API key", { timeout: 10000 }, async () => {
    const automation = await createPublishedApiAutomation(testWorkspace.id);
    await createTestContacts(testWorkspace.id, [{ email: "readonly@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    const contactId = contact?.id as string;
    const request = post(`/automations/${automation.id}/trigger`, { contactId }, readOnlyApiKey.key);
    const params = Promise.resolve({ automationId: automation.id });
    const response = await POST(request, { params });

    expect(response.status).toBe(401);
  });
});
