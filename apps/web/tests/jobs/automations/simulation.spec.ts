/**
 * Real-World Automation Simulation Tests
 *
 * These tests simulate realistic automation scenarios that a Kibamail user
 * would build — complete with real database records, multiple contacts flowing
 * through the same automation, branching, delays, and concurrent triggers.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { evaluateTriggers } from "@/jobs/automations/evaluate-triggers";
import { executeStep } from "@/jobs/automations/execute-step";
import { pauseAutomation, resumeAutomationRuns } from "@/jobs/automations/pause-automation";
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
  type CreatedApiKey,
  type TestWorkspace,
} from "@/tests/utils";

// Mock webhook dispatch — we verify calls but don't hit Outpost
const { mockDispatchWebhook } = vi.hoisted(() => ({
  mockDispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/webhooks/dispatch", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, dispatchWebhook: mockDispatchWebhook };
});

let workspace: TestWorkspace;

// ============================================================
// Test Helpers
// ============================================================

function node(id: string, type: string, data: Record<string, unknown> = {}): FlowNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function edge(source: string, target: string, sourceHandle?: string): FlowEdge {
  return { id: `${source}->${target}`, source, target, sourceHandle: sourceHandle ?? null };
}

async function publishAutomation(opts: {
  name: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  nodes: FlowNode[];
  edges: FlowEdge[];
}) {
  return prisma.automation.create({
    data: {
      workspaceId: workspace.id,
      name: opts.name,
      status: "PUBLISHED",
      triggerType: opts.triggerType as never,
      triggerConfig: opts.triggerConfig ?? {},
      nodes: opts.nodes as never,
      edges: opts.edges as never,
      publishedAt: new Date(),
    },
  });
}

async function createDomainAndSender() {
  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId: workspace.id,
      name: `sim-${Date.now()}.example.com`,
      dkimSubDomain: "kiba._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      dkimVerifiedAt: new Date(),
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      returnPathDomainVerifiedAt: new Date(),
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      maxSendPerDay: 10000,
      maxSendPerHour: 2000,
    },
  });

  const sender = await prisma.senderIdentity.create({
    data: {
      workspaceId: workspace.id,
      sendingDomainId: domain.id,
      name: "Kibamail Team",
      email: "hello",
    },
  });

  return { domain, sender };
}

/** Run a contact through an automation from trigger to completion, stepping each node. */
async function runToCompletion(automationId: string, contactId: string, maxSteps = 20): Promise<{
  run: NonNullable<Awaited<ReturnType<typeof prisma.automationRun.findUnique>>>;
  stepsExecuted: number;
}> {
  const run = await prisma.automationRun.findFirst({
    where: { automationId, contactId, status: "ACTIVE" },
  });
  if (!run) throw new Error(`No active run found for automation=${automationId} contact=${contactId}`);

  let steps = 0;
  let currentNodeId = run.currentNodeId;

  while (currentNodeId && steps < maxSteps) {
    await executeStep({ automationRunId: run.id, nodeId: currentNodeId }, `sim-step-${steps}`);
    steps++;

    const updated = await prisma.automationRun.findUnique({ where: { id: run.id } });
    if (!updated || updated.status !== "ACTIVE") break;
    currentNodeId = updated.currentNodeId;

    // If there's a delayed job, stop — the contact is waiting
    if (updated.scheduledAt) break;
  }

  const finalRun = await prisma.automationRun.findUnique({ where: { id: run.id } });
  return { run: finalRun as NonNullable<typeof finalRun>, stepsExecuted: steps };
}

// ============================================================
// Setup / Teardown
// ============================================================

beforeAll(async () => {
  workspace = createTestWorkspace();
});

afterAll(async () => {
  // Clean up all BullMQ jobs
  for (const qName of ["automations", "emails", "webhooks"] as const) {
    const q = queue(qName).getQueue().getQueue();
    const jobs = await q.getJobs(["waiting", "delayed", "active", "completed", "failed"]);
    await Promise.all(jobs.map((j) => j.remove()));
  }
  await cleanupWorkspace(workspace.id);
});

beforeEach(async () => {
  mockDispatchWebhook.mockClear();
  await prisma.contactTopic.deleteMany({ where: { contact: { workspaceId: workspace.id } } });
  await prisma.automationRun.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.automation.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.contact.deleteMany({ where: { workspaceId: workspace.id } });
});

// ============================================================
// Simulation 1: Welcome Series
//
// A SaaS company creates an automation that fires when a new contact
// subscribes. It sends a welcome email, waits 1 day, then checks if
// the contact is still subscribed. If yes → adds them to "Onboarding"
// topic. If no → ends.
//
// Graph:
//   [CONTACT_SUBSCRIBED]
//          ↓
//     [SEND_EMAIL: "Welcome!"]
//          ↓
//     [TIME_DELAY: 1 day]
//          ↓
//     [IF_ELSE: status == SUBSCRIBED?]
//      ↓ true          ↓ false
//  [ADD_TO_TOPIC]    (end)
// ============================================================

describe("Simulation: Welcome Email Series", () => {
  test("subscriber flows through welcome → delay → condition check → topic add", { timeout: 30000 }, async () => {
    await createDomainAndSender();
    const topics = await createTestTopics(workspace.id, [{ name: "Onboarding" }]);

    const automation = await publishAutomation({
      name: "Welcome Series",
      triggerType: "CONTACT_SUBSCRIBED",
      nodes: [
        node("trigger", "contact-subscribed"),
        node("welcome-email", "send-email", { subject: "Welcome to Kibamail!", templateId: "tpl_welcome" }),
        node("wait-1-day", "time-delay", { duration: 1, unit: "days" }),
        node("still-subscribed", "if-else", {
          conditions: { field: "status", operator: "eq", value: "SUBSCRIBED" },
        }),
        node("add-onboarding", "add-to-topic", { topicIds: [topics[0].id] }),
      ],
      edges: [
        edge("trigger", "welcome-email"),
        edge("welcome-email", "wait-1-day"),
        edge("wait-1-day", "still-subscribed"),
        edge("still-subscribed", "add-onboarding", "true"),
      ],
    });

    // Create 3 subscribers
    await createTestContacts(workspace.id, [
      { email: "alice@example.com", firstName: "Alice", status: "SUBSCRIBED" },
      { email: "bob@example.com", firstName: "Bob", status: "SUBSCRIBED" },
      { email: "carol@example.com", firstName: "Carol", status: "SUBSCRIBED" },
    ]);
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { email: "asc" },
    });

    // ── Trigger all 3 contacts ──
    for (const contact of contacts) {
      const event: AutomationEvent = { type: "contact.subscribed", payload: { contactId: contact.id } };
      await evaluateTriggers({ workspaceId: workspace.id, event: event as never }, `sim-trigger-${contact.email}`);
    }

    // All 3 should have active runs
    const runs = await prisma.automationRun.findMany({
      where: { automationId: automation.id, status: "ACTIVE" },
    });
    expect(runs).toHaveLength(3);

    // ── Step 1: Execute SEND_EMAIL for all contacts ──
    for (const run of runs) {
      await executeStep({ automationRunId: run.id, nodeId: "welcome-email" }, `sim-email-${run.id}`);
    }

    // Verify emails were queued (3 jobs in emails queue)
    const emailsQueue = queue("emails").getQueue().getQueue();
    const emailJobs = await emailsQueue.getJobs(["waiting", "delayed"]);
    const automationEmails = emailJobs.filter((j) => j.name === "send-transactional" && j.data?.metadata?.automationId === automation.id);
    expect(automationEmails.length).toBe(3);

    // ── Step 2: Execute TIME_DELAY for all contacts ──
    for (const run of runs) {
      const refreshed = await prisma.automationRun.findUnique({ where: { id: run.id } });
      const refreshedId = refreshed?.id as string;
      await executeStep({ automationRunId: refreshedId, nodeId: "wait-1-day" }, `sim-delay-${run.id}`);
    }

    // All runs should now have scheduled jobs with ~1 day delay
    const delayedRuns = await prisma.automationRun.findMany({
      where: { automationId: automation.id },
    });
    for (const run of delayedRuns) {
      expect(run.scheduledAt).not.toBeNull();
      expect(run.pendingJobId).not.toBeNull();

      const pendingJobId = run.pendingJobId as string;
      const job = await queue("automations").getQueue().getQueue().getJob(pendingJobId);
      expect(job).not.toBeNull();
      expect(job?.opts.delay).toBe(86_400_000); // 1 day in ms
    }

    // ── Simulate: Bob unsubscribes during the delay ──
    await prisma.contact.update({
      where: { id: contacts[1].id }, // Bob
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });

    // ── Step 3: Execute IF_ELSE for all contacts (after delay expires) ──
    for (const run of delayedRuns) {
      await executeStep({ automationRunId: run.id, nodeId: "still-subscribed" }, `sim-ifelse-${run.id}`);
    }

    // Alice and Carol → true branch (add-onboarding)
    // Bob → false branch (no outgoing edge, so run completes)
    const aliceRun = await prisma.automationRun.findFirst({ where: { automationId: automation.id, contactId: contacts[0].id } });
    const bobRun = await prisma.automationRun.findFirst({ where: { automationId: automation.id, contactId: contacts[1].id } });
    const carolRun = await prisma.automationRun.findFirst({ where: { automationId: automation.id, contactId: contacts[2].id } });

    expect(aliceRun?.currentNodeId).toBe("add-onboarding");
    expect(bobRun?.status).toBe("COMPLETED"); // No false branch → completed
    expect(carolRun?.currentNodeId).toBe("add-onboarding");

    const aliceDecisions = (aliceRun?.executionState as { branchDecisions: Record<string, string> }).branchDecisions;
    const bobDecisions = (bobRun?.executionState as { branchDecisions: Record<string, string> }).branchDecisions;
    expect(aliceDecisions["still-subscribed"]).toBe("true");
    expect(bobDecisions["still-subscribed"]).toBe("false");

    // ── Step 4: Execute ADD_TO_TOPIC for Alice and Carol ──
    const aliceRunId = aliceRun?.id as string;
    const carolRunId = carolRun?.id as string;
    await executeStep({ automationRunId: aliceRunId, nodeId: "add-onboarding" }, "sim-topic-alice");
    await executeStep({ automationRunId: carolRunId, nodeId: "add-onboarding" }, "sim-topic-carol");

    // Verify completion
    const finalAlice = await prisma.automationRun.findUnique({ where: { id: aliceRunId } });
    const finalCarol = await prisma.automationRun.findUnique({ where: { id: carolRunId } });
    expect(finalAlice?.status).toBe("COMPLETED");
    expect(finalCarol?.status).toBe("COMPLETED");

    // Verify topic subscriptions
    const aliceTopic = await prisma.contactTopic.findFirst({ where: { contactId: contacts[0].id, topicId: topics[0].id } });
    const bobTopic = await prisma.contactTopic.findFirst({ where: { contactId: contacts[1].id, topicId: topics[0].id } });
    const carolTopic = await prisma.contactTopic.findFirst({ where: { contactId: contacts[2].id, topicId: topics[0].id } });

    expect(aliceTopic).not.toBeNull();
    expect(aliceTopic?.status).toBe("SUBSCRIBED");
    expect(bobTopic).toBeNull(); // Bob never reached this step
    expect(carolTopic).not.toBeNull();

    // Verify lifecycle webhooks were dispatched
    const enteredCalls = mockDispatchWebhook.mock.calls.filter(
      (c: unknown[]) => c[1] === "automation.contact_entered",
    );
    const exitedCalls = mockDispatchWebhook.mock.calls.filter(
      (c: unknown[]) => c[1] === "automation.contact_exited",
    );
    const stepCalls = mockDispatchWebhook.mock.calls.filter(
      (c: unknown[]) => c[1] === "automation.step_completed",
    );
    expect(enteredCalls).toHaveLength(3);
    expect(exitedCalls).toHaveLength(3); // All 3 completed (Bob via false branch)
    expect(stepCalls.length).toBeGreaterThanOrEqual(9); // At least 3 contacts × 3 steps each
  });
});

// ============================================================
// Simulation 2: A/B Test Campaign
//
// A marketing team builds an automation on form submission.
// After the trigger, contacts are randomly split 70/30 into two
// branches — each adds them to a different topic to receive
// different email campaigns.
//
// Graph:
//   [FORM_SUBMITTED: formId=X]
//          ↓
//   [PERCENTAGE_SPLIT: 70% / 30%]
//     ↓ branch-a (70%)       ↓ branch-b (30%)
//  [ADD_TO_TOPIC: "Campaign A"]  [ADD_TO_TOPIC: "Campaign B"]
// ============================================================

describe("Simulation: A/B Test on Form Submission", () => {
  test("50 contacts are distributed across two branches", { timeout: 30000 }, async () => {
    const topics = await createTestTopics(workspace.id, [
      { name: "Campaign A" },
      { name: "Campaign B" },
    ]);

    const form = await prisma.form.create({
      data: {
        workspaceId: workspace.id,
        name: "Signup Form",
        type: "SIGN_UP",
        status: "PUBLISHED",
        fields: [],
        publishedAt: new Date(),
      },
    });

    const automation = await publishAutomation({
      name: "A/B Signup Test",
      triggerType: "FORM_SUBMITTED",
      triggerConfig: { formId: form.id },
      nodes: [
        node("trigger", "form-filled", { formId: form.id }),
        node("split", "percentage-split", {
          splits: [
            { id: "branch-a", name: "Campaign A", percentage: 70 },
            { id: "branch-b", name: "Campaign B", percentage: 30 },
          ],
        }),
        node("topic-a", "add-to-topic", { topicIds: [topics[0].id] }),
        node("topic-b", "add-to-topic", { topicIds: [topics[1].id] }),
      ],
      edges: [
        edge("trigger", "split"),
        edge("split", "topic-a", "branch-a"),
        edge("split", "topic-b", "branch-b"),
      ],
    });

    // Create 50 contacts
    const contactEmails = Array.from({ length: 50 }, (_, i) => ({
      email: `ab-test-${i}@example.com`,
      firstName: `User${i}`,
      status: "SUBSCRIBED" as const,
    }));
    await createTestContacts(workspace.id, contactEmails);
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { email: "asc" },
    });

    // Trigger all 50
    for (const contact of contacts) {
      const event: AutomationEvent = {
        type: "form.submitted",
        payload: { contactId: contact.id, formId: form.id, submissionId: `sub_${contact.id}` },
      };
      await evaluateTriggers({ workspaceId: workspace.id, event: event as never }, `sim-ab-trigger-${contact.id}`);
    }

    const runs = await prisma.automationRun.findMany({
      where: { automationId: automation.id },
    });
    expect(runs).toHaveLength(50);

    // Execute PERCENTAGE_SPLIT for all 50
    for (const run of runs) {
      await executeStep({ automationRunId: run.id, nodeId: "split" }, `sim-ab-split-${run.id}`);
    }

    // Check distribution
    const updatedRuns = await prisma.automationRun.findMany({
      where: { automationId: automation.id },
    });

    let branchACount = 0;
    let branchBCount = 0;
    for (const run of updatedRuns) {
      const state = run.executionState as { branchDecisions: Record<string, string> };
      if (state.branchDecisions["split"] === "branch-a") branchACount++;
      else if (state.branchDecisions["split"] === "branch-b") branchBCount++;
    }

    expect(branchACount + branchBCount).toBe(50);
    // With 70/30 split and 50 contacts, expect rough distribution (not exact due to randomness)
    // Allow wide margin: A should get 20-45, B should get 5-30
    expect(branchACount).toBeGreaterThan(15);
    expect(branchACount).toBeLessThan(48);
    expect(branchBCount).toBeGreaterThan(2);

    // Execute topic-add for all contacts
    for (const run of updatedRuns) {
      const refreshed = await prisma.automationRun.findUnique({ where: { id: run.id } });
      const currentNodeId = refreshed?.currentNodeId as string;
      if (currentNodeId) {
        await executeStep({ automationRunId: run.id, nodeId: currentNodeId }, `sim-ab-topic-${run.id}`);
      }
    }

    // All runs should be COMPLETED
    const finalRuns = await prisma.automationRun.findMany({
      where: { automationId: automation.id },
    });
    for (const run of finalRuns) {
      expect(run.status).toBe("COMPLETED");
    }

    // Verify topic distribution matches branch distribution
    const topicACounts = await prisma.contactTopic.count({ where: { topicId: topics[0].id } });
    const topicBCounts = await prisma.contactTopic.count({ where: { topicId: topics[1].id } });
    expect(topicACounts).toBe(branchACount);
    expect(topicBCounts).toBe(branchBCount);
  });
});

// ============================================================
// Simulation 3: Pause During Active Automation
//
// A company fires an automation for 10 contacts. After 5 contacts
// have completed the first step and are waiting on a TIME_DELAY,
// the admin pauses the automation. All pending delayed jobs are
// removed. The admin later resumes, and all paused contacts
// continue from where they left off.
// ============================================================

describe("Simulation: Admin Pauses and Resumes Mid-Flight", () => {
  test("10 contacts paused at delay, then resumed and completed", { timeout: 30000 }, async () => {
    const topics = await createTestTopics(workspace.id, [{ name: "Post-Delay Topic" }]);

    const automation = await publishAutomation({
      name: "Pausable Automation",
      triggerType: "CONTACT_SUBSCRIBED",
      nodes: [
        node("trigger", "contact-subscribed"),
        node("delay", "time-delay", { duration: 2, unit: "hours" }),
        node("add-topic", "add-to-topic", { topicIds: [topics[0].id] }),
      ],
      edges: [
        edge("trigger", "delay"),
        edge("delay", "add-topic"),
      ],
    });

    // Create 10 contacts
    const emailList = Array.from({ length: 10 }, (_, i) => ({
      email: `pause-sim-${i}@example.com`,
      status: "SUBSCRIBED" as const,
    }));
    await createTestContacts(workspace.id, emailList);
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { email: "asc" },
    });

    // Trigger all 10
    for (const contact of contacts) {
      const event: AutomationEvent = { type: "contact.subscribed", payload: { contactId: contact.id } };
      await evaluateTriggers({ workspaceId: workspace.id, event: event as never }, `sim-pause-trigger-${contact.id}`);
    }

    // Execute TIME_DELAY for all 10 → they get delayed jobs
    const runs = await prisma.automationRun.findMany({ where: { automationId: automation.id } });
    expect(runs).toHaveLength(10);

    for (const run of runs) {
      await executeStep({ automationRunId: run.id, nodeId: "delay" }, `sim-pause-delay-${run.id}`);
    }

    // Verify all 10 have delayed jobs
    const delayedRuns = await prisma.automationRun.findMany({ where: { automationId: automation.id } });
    const pendingJobIds = delayedRuns.map((r) => r.pendingJobId).filter(Boolean);
    expect(pendingJobIds).toHaveLength(10);

    // ── PAUSE ──
    await pauseAutomation({ automationId: automation.id, workspaceId: workspace.id }, "sim-pause");

    // Verify all runs paused
    const pausedRuns = await prisma.automationRun.findMany({ where: { automationId: automation.id } });
    for (const run of pausedRuns) {
      expect(run.status).toBe("PAUSED");
      expect(run.pendingJobId).toBeNull();
    }

    // Verify BullMQ jobs were removed
    const bullmqQueue = queue("automations").getQueue().getQueue();
    for (const jobId of pendingJobIds) {
      const job = await bullmqQueue.getJob(jobId as string);
      expect(job).toBeFalsy();
    }

    // ── RESUME ──
    const resumed = await resumeAutomationRuns(automation.id, workspace.id);
    expect(resumed).toBe(10);

    // Verify all runs are active again with new pending jobs
    const resumedRuns = await prisma.automationRun.findMany({ where: { automationId: automation.id } });
    for (const run of resumedRuns) {
      expect(run.status).toBe("ACTIVE");
      expect(run.pendingJobId).not.toBeNull();
    }

    // ── Complete: execute ADD_TO_TOPIC for all ──
    for (const run of resumedRuns) {
      await executeStep({ automationRunId: run.id, nodeId: "add-topic" }, `sim-pause-topic-${run.id}`);
    }

    // All 10 completed
    const completedRuns = await prisma.automationRun.findMany({ where: { automationId: automation.id } });
    for (const run of completedRuns) {
      expect(run.status).toBe("COMPLETED");
    }

    // All 10 contacts have the topic
    const topicSubs = await prisma.contactTopic.count({ where: { topicId: topics[0].id } });
    expect(topicSubs).toBe(10);
  });
});

// ============================================================
// Simulation 4: Concurrent Automations for Same Contact
//
// A contact subscribes, triggering TWO different automations at
// the same time. Both run independently and complete without
// interfering with each other.
// ============================================================

describe("Simulation: Multiple Automations for Same Contact", () => {
  test("one contact triggers two automations independently", { timeout: 30000 }, async () => {
    const topics = await createTestTopics(workspace.id, [
      { name: "Welcome Topic" },
      { name: "VIP Topic" },
    ]);

    // Automation 1: Adds to Welcome Topic
    const auto1 = await publishAutomation({
      name: "Welcome Flow",
      triggerType: "CONTACT_SUBSCRIBED",
      nodes: [
        node("t1", "contact-subscribed"),
        node("a1", "add-to-topic", { topicIds: [topics[0].id] }),
      ],
      edges: [edge("t1", "a1")],
    });

    // Automation 2: Adds to VIP Topic
    const auto2 = await publishAutomation({
      name: "VIP Flow",
      triggerType: "CONTACT_SUBSCRIBED",
      nodes: [
        node("t1", "contact-subscribed"),
        node("a1", "add-to-topic", { topicIds: [topics[1].id] }),
      ],
      edges: [edge("t1", "a1")],
    });

    await createTestContacts(workspace.id, [
      { email: "multi-auto@example.com", firstName: "Dave", status: "SUBSCRIBED" },
    ]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: workspace.id } });

    // Single event triggers BOTH automations
    const contactId = contact?.id as string;
    const event: AutomationEvent = { type: "contact.subscribed", payload: { contactId } };
    await evaluateTriggers({ workspaceId: workspace.id, event: event as never }, "sim-multi-trigger");

    // Should have 2 runs — one per automation
    const allRuns = await prisma.automationRun.findMany({
      where: { contactId, status: "ACTIVE" },
    });
    expect(allRuns).toHaveLength(2);

    const run1 = allRuns.find((r) => r.automationId === auto1.id);
    const run2 = allRuns.find((r) => r.automationId === auto2.id);
    const run1Id = run1?.id as string;
    const run2Id = run2?.id as string;

    // Execute both independently
    await executeStep({ automationRunId: run1Id, nodeId: "a1" }, "sim-multi-exec-1");
    await executeStep({ automationRunId: run2Id, nodeId: "a1" }, "sim-multi-exec-2");

    // Both completed
    const finalRun1 = await prisma.automationRun.findUnique({ where: { id: run1Id } });
    const finalRun2 = await prisma.automationRun.findUnique({ where: { id: run2Id } });
    expect(finalRun1?.status).toBe("COMPLETED");
    expect(finalRun2?.status).toBe("COMPLETED");

    // Contact should be in both topics
    const contactTopics = await prisma.contactTopic.findMany({
      where: { contactId },
      orderBy: { topicId: "asc" },
    });
    expect(contactTopics).toHaveLength(2);
    expect(contactTopics.map((ct) => ct.topicId).sort()).toEqual(
      [topics[0].id, topics[1].id].sort(),
    );
  });
});

// ============================================================
// Simulation 5: Custom Event with Property Filtering
//
// An e-commerce company fires a "purchase_completed" custom event.
// Only automations with triggerConfig.eventName === "purchase_completed"
// should match. Other automations with different event names are ignored.
// ============================================================

describe("Simulation: Custom Event Trigger with Config Filtering", () => {
  test("only matching eventName automations fire", { timeout: 30000 }, async () => {
    const topics = await createTestTopics(workspace.id, [
      { name: "Purchasers" },
      { name: "Registrants" },
    ]);

    // Automation 1: Triggers on "purchase_completed"
    const purchaseAuto = await publishAutomation({
      name: "Post-Purchase",
      triggerType: "EVENT",
      triggerConfig: { eventName: "purchase_completed" },
      nodes: [
        node("t1", "event", { eventName: "purchase_completed" }),
        node("a1", "add-to-topic", { topicIds: [topics[0].id] }),
      ],
      edges: [edge("t1", "a1")],
    });

    // Automation 2: Triggers on "webinar_registered" (should NOT fire)
    const webinarAuto = await publishAutomation({
      name: "Post-Webinar",
      triggerType: "EVENT",
      triggerConfig: { eventName: "webinar_registered" },
      nodes: [
        node("t1", "event", { eventName: "webinar_registered" }),
        node("a1", "add-to-topic", { topicIds: [topics[1].id] }),
      ],
      edges: [edge("t1", "a1")],
    });

    await createTestContacts(workspace.id, [
      { email: "buyer@example.com", firstName: "Eve", status: "SUBSCRIBED" },
    ]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: workspace.id } });

    // Fire purchase_completed event
    const contactId = contact?.id as string;
    const event: AutomationEvent = {
      type: "custom_event",
      payload: { contactId, eventName: "purchase_completed", properties: { amount: 99 } },
    };
    await evaluateTriggers({ workspaceId: workspace.id, event: event as never }, "sim-event-trigger");

    // Only the purchase automation should have a run
    const purchaseRuns = await prisma.automationRun.findMany({ where: { automationId: purchaseAuto.id } });
    const webinarRuns = await prisma.automationRun.findMany({ where: { automationId: webinarAuto.id } });

    expect(purchaseRuns).toHaveLength(1);
    expect(webinarRuns).toHaveLength(0);

    // Complete the purchase automation
    await executeStep({ automationRunId: purchaseRuns[0].id, nodeId: "a1" }, "sim-event-exec");

    const finalRun = await prisma.automationRun.findUnique({ where: { id: purchaseRuns[0].id } });
    expect(finalRun?.status).toBe("COMPLETED");

    // Only purchasers topic has a subscriber
    const purchaserSubs = await prisma.contactTopic.count({ where: { topicId: topics[0].id } });
    const registrantSubs = await prisma.contactTopic.count({ where: { topicId: topics[1].id } });
    expect(purchaserSubs).toBe(1);
    expect(registrantSubs).toBe(0);
  });
});
