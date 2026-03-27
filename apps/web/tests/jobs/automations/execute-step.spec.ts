import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { executeStep } from "@/jobs/automations/execute-step";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import type { FlowNode, FlowEdge } from "@/lib/automations/graph";
import {
  cleanupWorkspace,
  createTestWorkspace,
  createTestContacts,
  createTestTopics,
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

async function createPublishedAutomation(
  workspaceId: string,
  triggerType: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
) {
  return prisma.automation.create({
    data: {
      workspaceId,
      name: "Test Automation",
      status: "PUBLISHED",
      triggerType: triggerType as never,
      nodes: nodes as never,
      edges: edges as never,
      publishedAt: new Date(),
    },
  });
}

async function createRun(automationId: string, contactId: string, workspaceId: string, nodeId: string) {
  return prisma.automationRun.create({
    data: {
      automationId,
      contactId,
      workspaceId,
      status: "ACTIVE",
      currentNodeId: nodeId,
      executionState: { completedNodes: [], branchDecisions: {} },
    },
  });
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  const bullmqQueue = queue("automations").getQueue().getQueue();
  const allJobs = await bullmqQueue.getJobs(["waiting", "delayed", "active", "completed", "failed"]);
  await Promise.all(allJobs.map((j) => j.remove()));

  const emailsQueue = queue("emails").getQueue().getQueue();
  const emailJobs = await emailsQueue.getJobs(["waiting", "delayed", "active", "completed", "failed"]);
  await Promise.all(emailJobs.map((j) => j.remove()));

  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  mockDispatchWebhook.mockClear();
  await prisma.automationRun.deleteMany({ where: { workspaceId: testWorkspace.id } });
  await prisma.automation.deleteMany({ where: { workspaceId: testWorkspace.id } });
  await prisma.contact.deleteMany({ where: { workspaceId: testWorkspace.id } });
});

describe("executeStep job", () => {
  describe("guards", () => {
    test("returns early when run status is PAUSED", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "paused@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "paused@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await prisma.automationRun.create({
        data: {
          automationId: automation.id,
          contactId,
          workspaceId: testWorkspace.id,
          status: "PAUSED",
          currentNodeId: "a1",
          executionState: { completedNodes: [], branchDecisions: {} },
        },
      });

      await executeStep({ automationRunId: run.id, nodeId: "a1" }, "test-guard-paused");

      // Contact should NOT have been unsubscribed
      const updatedContact = await prisma.contact.findUnique({ where: { id: contactId } });
      expect(updatedContact?.status).toBe("SUBSCRIBED");
    });

    test("marks run CANCELLED when automation is no longer PUBLISHED", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });

      // Create as ARCHIVED
      const automation = await prisma.automation.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "Archived Automation",
          status: "ARCHIVED",
          triggerType: "CONTACT_SUBSCRIBED",
          nodes: nodes as never,
          edges: edges as never,
        },
      });

      await createTestContacts(testWorkspace.id, [{ email: "archived@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "archived@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "a1");

      await executeStep({ automationRunId: run.id, nodeId: "a1" }, "test-guard-archived");

      const updatedRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
      expect(updatedRun?.status).toBe("CANCELLED");
      expect(updatedRun?.errorMessage).toContain("no longer published");
    });
  });

  describe("linear flow", () => {
    test("marks run COMPLETED when reaching terminal node", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "terminal@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "terminal@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "a1");

      await executeStep({ automationRunId: run.id, nodeId: "a1" }, "test-terminal");

      const updatedRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
      expect(updatedRun?.status).toBe("COMPLETED");
      expect(updatedRun?.completedAt).not.toBeNull();

      const state = updatedRun?.executionState as { completedNodes: string[] };
      expect(state.completedNodes).toContain("a1");

      // Contact should be unsubscribed
      const updatedContact = await prisma.contact.findUnique({ where: { id: contactId } });
      expect(updatedContact?.status).toBe("UNSUBSCRIBED");
    });

    test("advances to next node when not terminal", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
        { id: "a2", type: "unsubscribe-contact" },
      );
      const edges = makeEdges(
        { source: "t1", target: "a1" },
        { source: "a1", target: "a2" },
      );
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "advance@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "advance@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "a1");

      await executeStep({ automationRunId: run.id, nodeId: "a1" }, "test-advance");

      const updatedRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
      expect(updatedRun?.status).toBe("ACTIVE");
      expect(updatedRun?.currentNodeId).toBe("a2");
      expect(updatedRun?.pendingJobId).not.toBeNull();

      // Verify the next job was queued
      const pendingJobId = updatedRun?.pendingJobId as string;
      const bullmqQueue = queue("automations").getQueue().getQueue();
      const job = await bullmqQueue.getJob(pendingJobId);
      expect(job).not.toBeNull();
      expect(job?.data.nodeId).toBe("a2");
    });
  });

  describe("IF_ELSE branching", () => {
    test("takes true branch when contact matches conditions", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        {
          id: "if1",
          type: "if-else",
          data: {
            conditions: { field: "status", operator: "eq", value: "SUBSCRIBED" },
          },
        },
        { id: "true-action", type: "unsubscribe-contact" },
        { id: "false-action", type: "unsubscribe-contact" },
      );
      const edges = makeEdges(
        { source: "t1", target: "if1" },
        { source: "if1", target: "true-action", sourceHandle: "true" },
        { source: "if1", target: "false-action", sourceHandle: "false" },
      );
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "ifelse-true@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "ifelse-true@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "if1");

      await executeStep({ automationRunId: run.id, nodeId: "if1" }, "test-if-true");

      const updatedRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
      expect(updatedRun?.currentNodeId).toBe("true-action");

      const state = updatedRun?.executionState as { branchDecisions: Record<string, string> };
      expect(state.branchDecisions["if1"]).toBe("true");
    });

    test("takes false branch when contact does not match conditions", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        {
          id: "if1",
          type: "if-else",
          data: {
            conditions: { field: "status", operator: "eq", value: "BOUNCED" },
          },
        },
        { id: "true-action", type: "unsubscribe-contact" },
        { id: "false-action", type: "unsubscribe-contact" },
      );
      const edges = makeEdges(
        { source: "t1", target: "if1" },
        { source: "if1", target: "true-action", sourceHandle: "true" },
        { source: "if1", target: "false-action", sourceHandle: "false" },
      );
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "ifelse-false@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "ifelse-false@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "if1");

      await executeStep({ automationRunId: run.id, nodeId: "if1" }, "test-if-false");

      const updatedRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
      expect(updatedRun?.currentNodeId).toBe("false-action");

      const state = updatedRun?.executionState as { branchDecisions: Record<string, string> };
      expect(state.branchDecisions["if1"]).toBe("false");
    });
  });

  describe("TIME_DELAY", () => {
    test("dispatches next execute-step with correct BullMQ delay", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "delay1", type: "time-delay", data: { duration: 30, unit: "seconds" } },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges(
        { source: "t1", target: "delay1" },
        { source: "delay1", target: "a1" },
      );
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "delay@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "delay@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "delay1");

      await executeStep({ automationRunId: run.id, nodeId: "delay1" }, "test-delay");

      const updatedRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
      expect(updatedRun?.scheduledAt).not.toBeNull();
      expect(updatedRun?.pendingJobId).not.toBeNull();

      // Verify the delayed job
      const pendingJobId = updatedRun?.pendingJobId as string;
      const bullmqQueue = queue("automations").getQueue().getQueue();
      const job = await bullmqQueue.getJob(pendingJobId);
      expect(job).not.toBeNull();
      expect(job?.data.nodeId).toBe("a1");
      expect(job?.opts.delay).toBe(30_000);
    });
  });

  describe("action execution", () => {
    test("add-to-topic creates ContactTopic records", async () => {
      const topics = await createTestTopics(testWorkspace.id, [
        { name: "Newsletter" },
      ]);

      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "add-to-topic", data: { topicIds: [topics[0].id] } },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "topic@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "topic@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "a1");

      await executeStep({ automationRunId: run.id, nodeId: "a1" }, "test-add-topic");

      const contactTopic = await prisma.contactTopic.findFirst({
        where: { contactId, topicId: topics[0].id },
      });
      expect(contactTopic).not.toBeNull();
      expect(contactTopic?.status).toBe("SUBSCRIBED");
    });

    test("unsubscribe-contact sets contact status to UNSUBSCRIBED", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "unsub@test.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "unsub@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "a1");

      await executeStep({ automationRunId: run.id, nodeId: "a1" }, "test-unsub");

      const updatedContact = await prisma.contact.findUnique({ where: { id: contactId } });
      expect(updatedContact?.status).toBe("UNSUBSCRIBED");
    });

    test("unsubscribe-contact is idempotent", async () => {
      const nodes = makeNodes(
        { id: "t1", type: "contact-subscribed" },
        { id: "a1", type: "unsubscribe-contact" },
      );
      const edges = makeEdges({ source: "t1", target: "a1" });
      const automation = await createPublishedAutomation(testWorkspace.id, "CONTACT_SUBSCRIBED", nodes, edges);

      await createTestContacts(testWorkspace.id, [{ email: "already-unsub@test.com", status: "UNSUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { email: "already-unsub@test.com", workspaceId: testWorkspace.id } });

      const contactId = contact?.id as string;
      const run = await createRun(automation.id, contactId, testWorkspace.id, "a1");

      // Should not throw
      await executeStep({ automationRunId: run.id, nodeId: "a1" }, "test-idempotent-unsub");

      const updatedRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
      expect(updatedRun?.status).toBe("COMPLETED");
    });
  });
});
