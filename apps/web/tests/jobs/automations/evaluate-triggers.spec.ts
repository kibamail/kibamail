import { afterAll, beforeAll, beforeEach, describe, expect, test, vi, type TestOptions } from "vitest";

const testTimeout: TestOptions = { timeout: 30000 };
import { POST as CREATE_POST } from "@/app/(main)/api/v1/automations/route";
import { PUT } from "@/app/(main)/api/v1/automations/[automationId]/route";
import { POST as PUBLISH_POST } from "@/app/(main)/api/v1/automations/[automationId]/publish/route";
import { evaluateTriggers } from "@/jobs/automations/evaluate-triggers";
import type { Email, Form } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import type { AutomationEvent } from "@/lib/automations/events";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  createTestContacts,
  post,
  put,
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
let testEmail: Email;
let testForm: Form;
let testFormAbc: Form;

async function createAndPublishAutomation(
  triggerType: string,
  triggerNodeType: string,
  triggerConfig: Record<string, unknown>,
  triggerNodeData: Record<string, unknown> = {},
) {
  const automationData = {
    name: `Test ${triggerType}`,
    trigger: { type: triggerType, config: triggerConfig },
    nodes: [
      {
        id: "trigger-1",
        type: triggerNodeType,
        position: { x: 0, y: 0 },
        data: triggerNodeData,
      },
    ],
    edges: [],
  };

  const createRequest = post("/automations", automationData, fullAccessApiKey.key);
  const createResponse = await CREATE_POST(createRequest);
  const created = await createResponse.json();

  // Add a send-email action node so it's a valid publishable automation
  const updateRequest = put(
    `/automations/${created.id}`,
    {
      nodes: [
        {
          id: "trigger-1",
          type: triggerNodeType,
          position: { x: 0, y: 0 },
          data: triggerNodeData,
        },
        {
          id: "action-1",
          type: "send-email",
          position: { x: 0, y: 100 },
          data: { templateId: testEmail.id },
        },
      ],
      edges: [{ id: "e1", source: "trigger-1", target: "action-1" }],
    },
    fullAccessApiKey.key,
  );
  const params = Promise.resolve({ automationId: created.id });
  await PUT(updateRequest, { params });

  // Publish
  const publishRequest = post(`/automations/${created.id}/publish`, {}, fullAccessApiKey.key);
  await PUBLISH_POST(publishRequest, { params: Promise.resolve({ automationId: created.id }) });

  return created.id;
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  testEmail = await prisma.email.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Test Automation Email",
      subject: "Test Email",
      htmlContent: "<p>Test</p>",
      type: "AUTOMATION",
    },
  });
  testForm = await prisma.form.create({
    data: { workspaceId: testWorkspace.id, name: "Test Form" },
  });
  testFormAbc = await prisma.form.create({
    data: { workspaceId: testWorkspace.id, name: "Test Form ABC" },
  });
});

afterAll(async () => {
  // Clean up any BullMQ jobs we created
  const bullmqQueue = queue("automations").getQueue().getQueue();
  const allJobs = await bullmqQueue.getJobs(["waiting", "delayed", "active", "completed", "failed"]);
  await Promise.all(allJobs.map((j) => j.remove()));
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  mockDispatchWebhook.mockClear();
  await prisma.automationRun.deleteMany({ where: { workspaceId: testWorkspace.id } });
});

describe("evaluateTriggers job", () => {
  describe("trigger matching", () => {
    test("matches CONTACT_SUBSCRIBED automation on contact.subscribed event", testTimeout, async () => {
      const automationId = await createAndPublishAutomation(
        "CONTACT_SUBSCRIBED",
        "contact-subscribed",
        {},
      );

      await createTestContacts(testWorkspace.id, [{ email: "trigger-test@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "trigger-test@example.com" } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-1");

      const run = await prisma.automationRun.findFirst({
        where: { automationId, contactId },
      });

      expect(run).not.toBeNull();
      expect(run?.status).toBe("ACTIVE");
      expect(run?.workspaceId).toBe(testWorkspace.id);
      expect(run?.pendingJobId).toBeDefined();
    });

    test("matches FORM_SUBMITTED automation when formId matches", testTimeout, async () => {
      const automationId = await createAndPublishAutomation(
        "FORM_SUBMITTED",
        "form-filled",
        { formId: testForm.id },
        { formId: testForm.id },
      );

      await createTestContacts(testWorkspace.id, [{ email: "form-match@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "form-match@example.com" } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "form.submitted",
        payload: { contactId, formId: testForm.id, submissionId: "sub_1" },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-2");

      const run = await prisma.automationRun.findFirst({ where: { automationId, contactId } });
      expect(run).not.toBeNull();
    });

    test("does NOT match FORM_SUBMITTED automation when formId differs", testTimeout, async () => {
      const automationId = await createAndPublishAutomation(
        "FORM_SUBMITTED",
        "form-filled",
        { formId: testFormAbc.id },
        { formId: testFormAbc.id },
      );

      await createTestContacts(testWorkspace.id, [{ email: "form-nomatch@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "form-nomatch@example.com" } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "form.submitted",
        payload: { contactId, formId: "form_different", submissionId: "sub_2" },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-3");

      const run = await prisma.automationRun.findFirst({ where: { automationId, contactId } });
      expect(run).toBeNull();
    });

    test("ignores DRAFT automations", testTimeout, async () => {
      // Create but don't publish
      const automationData = {
        name: "Draft Automation",
        trigger: { type: "CONTACT_SUBSCRIBED", config: {} },
        nodes: [{ id: "t1", type: "contact-subscribed", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };
      const req = post("/automations", automationData, fullAccessApiKey.key);
      const res = await CREATE_POST(req);
      const created = await res.json();

      await createTestContacts(testWorkspace.id, [{ email: "draft-test@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "draft-test@example.com" } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-draft");

      const run = await prisma.automationRun.findFirst({ where: { automationId: created.id, contactId } });
      expect(run).toBeNull();
    });
  });

  describe("deduplication", () => {
    test("skips contact with existing ACTIVE run", testTimeout, async () => {
      const automationId = await createAndPublishAutomation(
        "CONTACT_SUBSCRIBED",
        "contact-subscribed",
        {},
      );

      await createTestContacts(testWorkspace.id, [{ email: "dedup-active@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "dedup-active@example.com" } });

      const contactId = contact?.id as string;
      // Create an existing active run
      await prisma.automationRun.create({
        data: {
          automationId,
          contactId,
          workspaceId: testWorkspace.id,
          status: "ACTIVE",
          executionState: { completedNodes: [], branchDecisions: {} },
        },
      });

      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-dedup");

      // Should still only have 1 run (the original)
      const runs = await prisma.automationRun.findMany({ where: { automationId, contactId } });
      expect(runs).toHaveLength(1);
    });

    test("re-enrolls contact with COMPLETED run", testTimeout, async () => {
      const automationId = await createAndPublishAutomation(
        "CONTACT_SUBSCRIBED",
        "contact-subscribed",
        {},
      );

      await createTestContacts(testWorkspace.id, [{ email: "dedup-completed@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "dedup-completed@example.com" } });

      const contactId = contact?.id as string;
      // Create a completed run
      await prisma.automationRun.create({
        data: {
          automationId,
          contactId,
          workspaceId: testWorkspace.id,
          status: "COMPLETED",
          completedAt: new Date(),
          executionState: { completedNodes: ["trigger-1"], branchDecisions: {} },
        },
      });

      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-reenter");

      // Should now have 2 runs (1 completed + 1 new active)
      const runs = await prisma.automationRun.findMany({
        where: { automationId, contactId },
        orderBy: { createdAt: "desc" },
      });
      expect(runs).toHaveLength(2);
      expect(runs[0].status).toBe("ACTIVE");
      expect(runs[1].status).toBe("COMPLETED");
    });
  });

  describe("run creation", () => {
    test("creates AutomationRun with correct execution state", testTimeout, async () => {
      const automationId = await createAndPublishAutomation(
        "CONTACT_SUBSCRIBED",
        "contact-subscribed",
        {},
      );

      await createTestContacts(testWorkspace.id, [{ email: "state-test@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "state-test@example.com" } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-state");

      const run = await prisma.automationRun.findFirst({ where: { automationId, contactId } });
      expect(run).not.toBeNull();
      expect(run?.status).toBe("ACTIVE");
      expect(run?.currentNodeId).toBe("action-1");
      expect(run?.pendingJobId).not.toBeNull();

      const state = run?.executionState as { completedNodes: string[]; branchDecisions: Record<string, string> };
      expect(state.completedNodes).toEqual([]);
      expect(state.branchDecisions).toEqual({});
    });

    test("dispatches execute-step job to BullMQ queue", testTimeout, async () => {
      const automationId = await createAndPublishAutomation(
        "CONTACT_SUBSCRIBED",
        "contact-subscribed",
        {},
      );

      await createTestContacts(testWorkspace.id, [{ email: "queue-test@example.com", status: "SUBSCRIBED" }]);
      const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id, email: "queue-test@example.com" } });

      const contactId = contact?.id as string;
      const event: AutomationEvent = {
        type: "contact.subscribed",
        payload: { contactId },
      };

      await evaluateTriggers({ workspaceId: testWorkspace.id, event: event as never }, "test-job-queue");

      // Check that an execute-step job was dispatched
      const run = await prisma.automationRun.findFirst({ where: { automationId, contactId } });
      expect(run?.pendingJobId).toBeDefined();

      const pendingJobId = run?.pendingJobId as string;
      const bullmqQueue = queue("automations").getQueue().getQueue();
      const job = await bullmqQueue.getJob(pendingJobId);
      expect(job).not.toBeNull();
      expect(job?.name).toBe("execute-step");
      expect(job?.data.automationRunId).toBe(run?.id);
      expect(job?.data.nodeId).toBe("action-1");
    });
  });
});
