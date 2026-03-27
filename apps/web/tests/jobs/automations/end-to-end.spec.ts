import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { evaluateTriggers } from "@/jobs/automations/evaluate-triggers";
import { executeStep } from "@/jobs/automations/execute-step";
import { pauseAutomation, resumeAutomationRuns } from "@/jobs/automations/pause-automation";
import { POST as TRIGGER_POST } from "@/app/(main)/api/v1/automations/[automationId]/trigger/route";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import type { AutomationEvent } from "@/lib/automations/events";
import type { FlowNode, FlowEdge } from "@/lib/automations/graph";
import {
  cleanupWorkspace,
  createTestWorkspace,
  createTestContacts,
  createTestTopics,
  createFullAccessApiKey,
  post,
  type CreatedApiKey,
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

function makeNodes(...items: Array<{ id: string; type: string; data?: Record<string, unknown> }>): FlowNode[] {
  return items.map((item, i) => ({
    id: item.id,
    type: item.type,
    position: { x: 0, y: i * 100 },
    data: item.data || {},
  }));
}

function makeEdges(...items: Array<{ source: string; target: string; sourceHandle?: string }>): FlowEdge[] {
  return items.map((item) => ({
    id: `${item.source}-${item.target}`,
    source: item.source,
    target: item.target,
    sourceHandle: item.sourceHandle ?? null,
  }));
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
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

describe("end-to-end automation flows", () => {
  describe("simple linear: CONTACT_SUBSCRIBED → UNSUBSCRIBE_CONTACT", () => {
    test("trigger → evaluate → execute → complete", { timeout: 30000 }, async () => {
      // 1. Create automation
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });

      const automation = await prisma.automation.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "E2E Linear",
          status: "PUBLISHED",
          triggerType: "CONTACT_SUBSCRIBED",
          nodes: nodes as never,
          edges: edges as never,
          publishedAt: new Date(),
        },
      });

      // 2. Create a contact
      await createTestContacts(testWorkspace.id, [{ email: "e2e-linear@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

      // 3. Dispatch contact.subscribed event
      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "e2e-1");

      // 4. Verify AutomationRun was created
      const run = await prisma.automationRun.findFirst({
        where: { automationId: automation.id, contactId },
      });
      expect(run).not.toBeNull();
      expect(run?.status).toBe("ACTIVE");
      expect(run?.currentNodeId).toBe("a1");

      // 5. Execute the step
      const runId = run?.id as string;
      await executeStep({ automationRunId: runId, nodeId: "a1" }, "e2e-2");

      // 6. Verify run completed
      const completedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      expect(completedRun?.status).toBe("COMPLETED");
      expect(completedRun?.completedAt).not.toBeNull();

      // 7. Verify contact was unsubscribed
      const updatedContact = await prisma.contact.findUnique({ where: { id: contactId } });
      expect(updatedContact?.status).toBe("UNSUBSCRIBED");
    });
  });

  describe("branching: IF_ELSE → true/false paths", () => {
    test("contact matching conditions takes true branch", { timeout: 30000 }, async () => {
      const topics = await createTestTopics(testWorkspace.id, [{ name: "True Topic" }]);

      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        {
          id: "if1",
          type: "if-else",
          data: { conditions: { field: "status", operator: "eq", value: "SUBSCRIBED" } },
        },
        { id: "true-action", type: "add-to-topic", data: { topicIds: [topics[0].id] } },
        { id: "false-action", type: "unsubscribe-contact" },
      );
      const edges = makeEdges(
        { source: "t1", target: "if1" },
        { source: "if1", target: "true-action", sourceHandle: "true" },
        { source: "if1", target: "false-action", sourceHandle: "false" },
      );

      const automation = await prisma.automation.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "E2E Branch",
          status: "PUBLISHED",
          triggerType: "CONTACT_SUBSCRIBED",
          nodes: nodes as never,
          edges: edges as never,
          publishedAt: new Date(),
        },
      });

      await createTestContacts(testWorkspace.id, [{ email: "e2e-branch@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

      // Trigger
      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };
      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "e2e-branch-1");

      const run = await prisma.automationRun.findFirst({
        where: { automationId: automation.id, contactId },
      });

      // Execute IF_ELSE node
      const runId = run?.id as string;
      await executeStep({ automationRunId: runId, nodeId: "if1" }, "e2e-branch-2");

      let updatedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      expect(updatedRun?.currentNodeId).toBe("true-action");

      const state = updatedRun?.executionState as { branchDecisions: Record<string, string> };
      expect(state.branchDecisions["if1"]).toBe("true");

      // Execute true branch action
      await executeStep({ automationRunId: runId, nodeId: "true-action" }, "e2e-branch-3");

      updatedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      expect(updatedRun?.status).toBe("COMPLETED");

      // Verify topic was added (true branch) and contact was NOT unsubscribed (false branch skipped)
      const contactTopic = await prisma.contactTopic.findFirst({
        where: { contactId, topicId: topics[0].id },
      });
      expect(contactTopic).not.toBeNull();

      const updatedContact = await prisma.contact.findUnique({ where: { id: contactId } });
      expect(updatedContact?.status).toBe("SUBSCRIBED");
    });
  });

  describe("delay: API trigger → TIME_DELAY → ADD_TO_TOPIC", () => {
    test("full flow with time delay", { timeout: 30000 }, async () => {
      const topics = await createTestTopics(testWorkspace.id, [{ name: "Delayed Topic" }]);

      const nodes = makeNodes(
        { id: "t1", type: "webhook-trigger" },
        { id: "delay1", type: "time-delay", data: { duration: 10, unit: "seconds" } },
        { id: "a1", type: "add-to-topic", data: { topicIds: [topics[0].id] } },
      );
      const edges = makeEdges(
        { source: "t1", target: "delay1" },
        { source: "delay1", target: "a1" },
      );

      const automation = await prisma.automation.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "E2E Delay",
          status: "PUBLISHED",
          triggerType: "API",
          nodes: nodes as never,
          edges: edges as never,
          publishedAt: new Date(),
        },
      });

      await createTestContacts(testWorkspace.id, [{ email: "e2e-delay@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

      // Trigger via API endpoint
      const contactId = contact?.id as string;
      const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
      const params = Promise.resolve({ automationId: automation.id });
      const response = await TRIGGER_POST(request, { params });
      expect(response.status).toBe(201);

      const run = await prisma.automationRun.findFirst({
        where: { automationId: automation.id, contactId },
      });

      // Execute the TIME_DELAY node
      const runId = run?.id as string;
      await executeStep({ automationRunId: runId, nodeId: "delay1" }, "e2e-delay-1");

      let updatedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      expect(updatedRun?.scheduledAt).not.toBeNull();
      expect(updatedRun?.pendingJobId).not.toBeNull();

      // Verify the delayed job has correct delay
      const bullmqQueue = queue("automations").getQueue().getQueue();
      const pendingJobId = updatedRun?.pendingJobId as string;
      const delayedJob = await bullmqQueue.getJob(pendingJobId);
      expect(delayedJob?.opts.delay).toBe(10_000);

      // Simulate the delayed job executing (call executeStep for the next node)
      await executeStep({ automationRunId: runId, nodeId: "a1" }, "e2e-delay-2");

      updatedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      expect(updatedRun?.status).toBe("COMPLETED");

      // Verify topic was added
      const contactTopic = await prisma.contactTopic.findFirst({
        where: { contactId, topicId: topics[0].id },
      });
      expect(contactTopic).not.toBeNull();
    });
  });

  describe("pause mid-delay", () => {
    test("pause removes delayed job, resume creates new one", { timeout: 30000 }, async () => {
      const nodes = makeNodes(
        { id: "t1", type: "webhook-trigger" },
        { id: "delay1", type: "time-delay", data: { duration: 60, unit: "seconds" } },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges(
        { source: "t1", target: "delay1" },
        { source: "delay1", target: "a1" },
      );

      const automation = await prisma.automation.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "E2E Pause",
          status: "PUBLISHED",
          triggerType: "API",
          nodes: nodes as never,
          edges: edges as never,
          publishedAt: new Date(),
        },
      });

      await createTestContacts(testWorkspace.id, [{ email: "e2e-pause@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

      // Trigger
      const contactId = contact?.id as string;
      const request = post(`/automations/${automation.id}/trigger`, { contactId }, fullAccessApiKey.key);
      await TRIGGER_POST(request, { params: Promise.resolve({ automationId: automation.id }) });

      const run = await prisma.automationRun.findFirst({
        where: { automationId: automation.id, contactId },
      });

      // Execute TIME_DELAY (creates delayed job)
      const runId = run?.id as string;
      await executeStep({ automationRunId: runId, nodeId: "delay1" }, "e2e-pause-1");

      let updatedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      const delayedJobId = updatedRun?.pendingJobId as string;

      // Verify delayed job exists
      const bullmqQueue = queue("automations").getQueue().getQueue();
      let delayedJob = await bullmqQueue.getJob(delayedJobId);
      expect(delayedJob).not.toBeNull();

      // PAUSE the automation
      await pauseAutomation({ automationId: automation.id, workspaceId: testWorkspace.id }, "e2e-pause-2");

      // Verify run is paused
      updatedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      expect(updatedRun?.status).toBe("PAUSED");
      expect(updatedRun?.pendingJobId).toBeNull();

      // Verify delayed job was removed
      delayedJob = await bullmqQueue.getJob(delayedJobId);
      expect(delayedJob).toBeFalsy();

      // RESUME
      const resumed = await resumeAutomationRuns(automation.id, testWorkspace.id);
      expect(resumed).toBe(1);

      updatedRun = await prisma.automationRun.findUnique({ where: { id: runId } });
      expect(updatedRun?.status).toBe("ACTIVE");
      expect(updatedRun?.pendingJobId).not.toBeNull();

      // New delayed job should exist
      const newPendingJobId = updatedRun?.pendingJobId as string;
      const newJob = await bullmqQueue.getJob(newPendingJobId);
      expect(newJob).not.toBeNull();
    });
  });

  describe("deduplication", () => {
    test("same contact triggered twice while ACTIVE → second skipped", { timeout: 30000 }, async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "delay1", type: "time-delay", data: { duration: 300, unit: "seconds" } },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges(
        { source: "t1", target: "delay1" },
        { source: "delay1", target: "a1" },
      );

      const automation = await prisma.automation.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "E2E Dedup",
          status: "PUBLISHED",
          triggerType: "CONTACT_SUBSCRIBED",
          nodes: nodes as never,
          edges: edges as never,
          publishedAt: new Date(),
        },
      });

      await createTestContacts(testWorkspace.id, [{ email: "e2e-dedup@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      // First trigger — creates run
      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "e2e-dedup-1");

      // Second trigger — should be skipped
      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "e2e-dedup-2");

      const runs = await prisma.automationRun.findMany({
        where: { automationId: automation.id, contactId },
      });
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe("ACTIVE");
    });

    test("same contact triggered after COMPLETED → new run created", { timeout: 30000 }, async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });

      const automation = await prisma.automation.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "E2E Re-entry",
          status: "PUBLISHED",
          triggerType: "CONTACT_SUBSCRIBED",
          nodes: nodes as never,
          edges: edges as never,
          publishedAt: new Date(),
        },
      });

      await createTestContacts(testWorkspace.id, [{ email: "e2e-reentry@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      // First trigger
      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "e2e-reentry-1");
      const run1 = await prisma.automationRun.findFirst({
        where: { automationId: automation.id, contactId, status: "ACTIVE" },
      });

      // Complete the first run
      const run1Id = run1?.id as string;
      await executeStep({ automationRunId: run1Id, nodeId: "a1" }, "e2e-reentry-2");

      // Re-subscribe the contact so it's valid again
      await prisma.contact.update({ where: { id: contactId }, data: { status: "SUBSCRIBED" } });

      // Second trigger — should create new run
      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "e2e-reentry-3");

      const runs = await prisma.automationRun.findMany({
        where: { automationId: automation.id, contactId },
        orderBy: { createdAt: "asc" },
      });
      expect(runs).toHaveLength(2);
      expect(runs[0].status).toBe("COMPLETED");
      expect(runs[1].status).toBe("ACTIVE");
    });
  });
});
