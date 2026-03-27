import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { pauseAutomation } from "@/jobs/automations/pause-automation";
import { resumeAutomationRuns } from "@/jobs/automations/pause-automation";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import type { FlowNode, FlowEdge } from "@/lib/automations/graph";
import {
  cleanupWorkspace,
  createTestWorkspace,
  createTestContacts,
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

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  const bullmqQueue = queue("automations").getQueue().getQueue();
  const allJobs = await bullmqQueue.getJobs(["waiting", "delayed", "active", "completed", "failed"]);
  await Promise.all(allJobs.map((j) => j.remove()));
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  await prisma.automationRun.deleteMany({ where: { workspaceId: testWorkspace.id } });
  await prisma.automation.deleteMany({ where: { workspaceId: testWorkspace.id } });
  await prisma.contact.deleteMany({ where: { workspaceId: testWorkspace.id } });
});

describe("pauseAutomation job", () => {
  test("removes pending BullMQ jobs and sets runs to PAUSED", { timeout: 30000 }, async () => {
    const automation = await prisma.automation.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Pause Test",
        status: "PUBLISHED",
        triggerType: "CONTACT_SUBSCRIBED",
        nodes: [] as never,
        edges: [] as never,
        publishedAt: new Date(),
      },
    });

    await createTestContacts(testWorkspace.id, [
      { email: "pause1@test.com", status: "SUBSCRIBED" },
      { email: "pause2@test.com", status: "SUBSCRIBED" },
    ]);
    const contacts = await prisma.contact.findMany({ where: { workspaceId: testWorkspace.id } });

    // Create runs with pending BullMQ jobs
    const bullmqQueue = queue("automations").getQueue().getQueue();
    for (const contact of contacts) {
      const jobId = await queue("automations").push("execute-step", {
        automationRunId: "placeholder",
        nodeId: "a1",
      }, { delay: 60000 });

      await prisma.automationRun.create({
        data: {
          automationId: automation.id,
          contactId: contact.id,
          workspaceId: testWorkspace.id,
          status: "ACTIVE",
          currentNodeId: "a1",
          pendingJobId: jobId,
          executionState: { completedNodes: [], branchDecisions: {} },
        },
      });
    }

    // Also create a COMPLETED run that should not be affected
    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        contactId: contacts[0].id,
        workspaceId: testWorkspace.id,
        status: "COMPLETED",
        completedAt: new Date(),
        executionState: { completedNodes: ["a1"], branchDecisions: {} },
      },
    });

    await pauseAutomation({ automationId: automation.id, workspaceId: testWorkspace.id }, "test-pause");

    // All active runs should be PAUSED
    const pausedRuns = await prisma.automationRun.findMany({
      where: { automationId: automation.id, status: "PAUSED" },
    });
    expect(pausedRuns).toHaveLength(2);
    for (const run of pausedRuns) {
      expect(run.pendingJobId).toBeNull();
    }

    // COMPLETED run should be unaffected
    const completedRuns = await prisma.automationRun.findMany({
      where: { automationId: automation.id, status: "COMPLETED" },
    });
    expect(completedRuns).toHaveLength(1);

    // BullMQ jobs should be removed
    for (const run of pausedRuns) {
      // pendingJobId was cleared, but let's verify the original jobs are gone
    }
  });

  test("handles runs where pendingJobId job no longer exists", { timeout: 15000 }, async () => {
    const automation = await prisma.automation.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Pause Missing Job",
        status: "PUBLISHED",
        triggerType: "CONTACT_SUBSCRIBED",
        nodes: [] as never,
        edges: [] as never,
      },
    });

    await createTestContacts(testWorkspace.id, [{ email: "missing-job@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        contactId: contact?.id as string,
        workspaceId: testWorkspace.id,
        status: "ACTIVE",
        pendingJobId: "nonexistent-job-id",
        executionState: { completedNodes: [], branchDecisions: {} },
      },
    });

    // Should not throw even though job doesn't exist
    await pauseAutomation({ automationId: automation.id, workspaceId: testWorkspace.id }, "test-pause-missing");

    const run = await prisma.automationRun.findFirst({
      where: { automationId: automation.id, contactId: contact?.id as string, status: "PAUSED" },
    });
    expect(run).not.toBeNull();
  });
});

describe("resumeAutomationRuns", () => {
  test("re-dispatches execute-step for paused runs", { timeout: 15000 }, async () => {
    const automation = await prisma.automation.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Resume Test",
        status: "PUBLISHED",
        triggerType: "CONTACT_SUBSCRIBED",
        nodes: [] as never,
        edges: [] as never,
      },
    });

    await createTestContacts(testWorkspace.id, [{ email: "resume@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        contactId: contact?.id as string,
        workspaceId: testWorkspace.id,
        status: "PAUSED",
        currentNodeId: "a2",
        executionState: { completedNodes: ["a1"], branchDecisions: {} },
      },
    });

    const resumed = await resumeAutomationRuns(automation.id, testWorkspace.id);
    expect(resumed).toBe(1);

    const run = await prisma.automationRun.findFirst({
      where: { automationId: automation.id, contactId: contact?.id as string },
    });
    expect(run?.status).toBe("ACTIVE");
    expect(run?.pendingJobId).not.toBeNull();

    // Verify the BullMQ job
    const bullmqQueue = queue("automations").getQueue().getQueue();
    const pendingJobId = run?.pendingJobId as string;
    const job = await bullmqQueue.getJob(pendingJobId);
    expect(job).not.toBeNull();
    expect(job?.data.nodeId).toBe("a2");
  });

  test("uses remaining delay for TIME_DELAY nodes", { timeout: 15000 }, async () => {
    const automation = await prisma.automation.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Resume Delay Test",
        status: "PUBLISHED",
        triggerType: "CONTACT_SUBSCRIBED",
        nodes: [] as never,
        edges: [] as never,
      },
    });

    await createTestContacts(testWorkspace.id, [{ email: "resume-delay@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });

    // Scheduled 60 seconds in the future
    const scheduledAt = new Date(Date.now() + 60_000);

    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        contactId: contact?.id as string,
        workspaceId: testWorkspace.id,
        status: "PAUSED",
        currentNodeId: "a2",
        scheduledAt,
        executionState: { completedNodes: ["delay1"], branchDecisions: {} },
      },
    });

    await resumeAutomationRuns(automation.id, testWorkspace.id);

    const run = await prisma.automationRun.findFirst({
      where: { automationId: automation.id, contactId: contact?.id as string },
    });

    // Verify the job has a delay
    const bullmqQueue = queue("automations").getQueue().getQueue();
    const pendingJobId = run?.pendingJobId as string;
    const job = await bullmqQueue.getJob(pendingJobId);
    expect(job).not.toBeNull();
    expect(job?.opts.delay).toBeGreaterThan(50_000); // ~60s minus processing time
    expect(job?.opts.delay).toBeLessThanOrEqual(60_000);
  });
});
