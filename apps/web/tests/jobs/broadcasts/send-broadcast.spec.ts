/**
 * Integration tests for Send Broadcast Job
 *
 * Tests that the send-broadcast job correctly:
 * - Fetches domain sending limits
 * - Snapshots recipient contact IDs
 * - Schedules batches based on warmup limits
 * - Dispatches batch jobs to BullMQ with correct delays
 *
 * These tests use real Redis/BullMQ - no mocking of core services.
 * Jobs are filtered by broadcast ID to avoid interference with other tests.
 */

import { afterAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import {
  cleanupWorkspace,
  createTestContacts,
  createTestWorkspace,
} from "@/tests/utils";
import { WARMUP_TIERS_BY_NUMBER } from "@/config/warmup";
import { sendBroadcast } from "@/jobs/broadcasts/send-broadcast";

// Track workspaces and broadcast IDs for cleanup
const workspacesToCleanup: string[] = [];
const broadcastIdsToCleanup: string[] = [];

async function createTestDomain(
  workspaceId: string,
  options: {
    name: string;
    maxSendPerDay: number;
    maxSendPerHour: number;
  }
) {
  return prisma.sendingDomain.create({
    data: {
      workspaceId,
      name: options.name,
      dkimSubDomain: "kiba._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
      maxSendPerDay: options.maxSendPerDay,
      maxSendPerHour: options.maxSendPerHour,
    },
  });
}

async function createTestSenderIdentity(
  workspaceId: string,
  sendingDomainId: string
) {
  return prisma.senderIdentity.create({
    data: {
      workspaceId,
      sendingDomainId,
      name: "Test Sender",
      email: "news",
    },
  });
}

async function createTestBroadcast(
  workspaceId: string,
  senderIdentityId: string,
  sendingDomainId: string
) {
  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: "Test Broadcast",
      status: "QUEUED_FOR_SENDING",
      senderIdentity: {
        connect: { id: senderIdentityId },
      },
      sendingDomain: {
        connect: { id: sendingDomainId },
      },
      emailContent: {
        create: {
          subject: "Test Subject",
          contentHtml: "<p>Test {{unsubscribe_url}}</p>",
        },
      },
    },
  });

  // Track for cleanup
  broadcastIdsToCleanup.push(broadcast.id);

  return broadcast;
}

/**
 * Small delay to ensure jobs are fully written to Redis
 */
async function waitForJobsToSettle() {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Get batch jobs for a specific broadcast from the queue
 */
async function getBatchJobsForBroadcast(broadcastId: string) {
  // Wait for jobs to settle in Redis
  await waitForJobsToSettle();

  const broadcastQueue = queue("broadcasts").getQueue().getQueue();

  // Get all possible job states
  const allJobs = await broadcastQueue.getJobs([
    "waiting",
    "delayed",
    "active",
    "completed",
    "failed",
    "paused",
    "prioritized",
  ]);

  // Filter for send-broadcast-batch jobs for this specific broadcast
  return allJobs.filter(
    (job) =>
      job.name === "send-broadcast-batch" && job.data?.broadcastId === broadcastId
  );
}

/**
 * Clean up all jobs created during tests
 */
async function cleanupTestJobs() {
  const broadcastQueue = queue("broadcasts").getQueue().getQueue();

  for (const broadcastId of broadcastIdsToCleanup) {
    const jobs = await getBatchJobsForBroadcast(broadcastId);
    await Promise.all(jobs.map((job) => job.remove()));
  }
}

afterAll(async () => {
  // Clean up all jobs created during tests
  await cleanupTestJobs();

  // Clean up all workspaces
  for (const workspaceId of workspacesToCleanup) {
    await cleanupWorkspace(workspaceId);
  }
});

describe("sendBroadcast job", () => {
  describe("Tier 3 domain (250/day, 50/hour) with 5,400 recipients", () => {
    test("should dispatch batches spread across 22 days", { timeout: 30000 }, async () => {
      // Create fresh workspace for this test
      const testWorkspace = createTestWorkspace();
      workspacesToCleanup.push(testWorkspace.id);

      const tier3 = WARMUP_TIERS_BY_NUMBER[3];

      // Create domain with Tier 3 limits
      const domain = await createTestDomain(testWorkspace.id, {
        name: `tier3-${Date.now()}.example.com`,
        maxSendPerDay: tier3.dailyLimit,
        maxSendPerHour: tier3.hourlyLimit,
      });

      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        domain.id
      );

      const broadcast = await createTestBroadcast(
        testWorkspace.id,
        senderIdentity.id,
        domain.id
      );

      // Create 5,400 contacts
      const contactData = Array.from({ length: 5400 }, (_, i) => ({
        email: `tier3-contact${i}-${Date.now()}@example.com`,
        status: "SUBSCRIBED" as const,
      }));
      await createTestContacts(testWorkspace.id, contactData);

      // Run the job
      await sendBroadcast({ broadcastId: broadcast.id }, "test-job-tier3");

      // Get batch jobs for THIS broadcast only
      const batchJobs = await getBatchJobsForBroadcast(broadcast.id);

      // Should have created batch jobs
      expect(batchJobs.length).toBeGreaterThan(0);

      // Calculate total contacts across all batches
      const totalContacts = batchJobs.reduce(
        (sum, job) => sum + (job.data.contactIds?.length ?? 0),
        0
      );
      expect(totalContacts).toBe(5400);

      // Verify each batch has max 50 contacts (hourly limit)
      for (const job of batchJobs) {
        expect(job.data.contactIds.length).toBeLessThanOrEqual(50);
        expect(job.data.broadcastId).toBe(broadcast.id);
        expect(job.data.batchId).toBeDefined();
      }

      // Verify broadcast status was updated to SENDING
      const updatedBroadcast = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
      });
      expect(updatedBroadcast?.status).toBe("SENDING");

      // Calculate days by grouping delays
      const delays = batchJobs.map((job) => job.opts?.delay ?? 0);
      const dayBuckets = new Set(
        delays.map((d) => Math.floor(d / (24 * 60 * 60 * 1000)))
      );

      // Should span approximately 22 days (5400 / 250 = 21.6)
      expect(dayBuckets.size).toBeGreaterThanOrEqual(20);
      expect(dayBuckets.size).toBeLessThanOrEqual(25);
    });
  });

  describe("Tier 8 domain (10,000/day, 2,000/hour) with 2,000 recipients", () => {
    test("should dispatch batches that complete in one day", async () => {
      // Create fresh workspace for this test
      const testWorkspace = createTestWorkspace();
      workspacesToCleanup.push(testWorkspace.id);

      const tier8 = WARMUP_TIERS_BY_NUMBER[8];

      // Create domain with Tier 8 limits
      const domain = await createTestDomain(testWorkspace.id, {
        name: `tier8-${Date.now()}.example.com`,
        maxSendPerDay: tier8.dailyLimit,
        maxSendPerHour: tier8.hourlyLimit,
      });

      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        domain.id
      );

      const broadcast = await createTestBroadcast(
        testWorkspace.id,
        senderIdentity.id,
        domain.id
      );

      // Create 2,000 contacts
      const contactData = Array.from({ length: 2000 }, (_, i) => ({
        email: `tier8-contact${i}-${Date.now()}@example.com`,
        status: "SUBSCRIBED" as const,
      }));
      await createTestContacts(testWorkspace.id, contactData);

      // Run the job
      await sendBroadcast({ broadcastId: broadcast.id }, "test-job-tier8");

      // Get batch jobs for THIS broadcast only
      const batchJobs = await getBatchJobsForBroadcast(broadcast.id);

      // Should create 2 batches of 1000 each (max batch size)
      expect(batchJobs.length).toBe(2);

      const sortedJobs = batchJobs.sort(
        (a, b) => a.data.contactIds.length - b.data.contactIds.length
      );
      expect(sortedJobs[0].data.contactIds.length).toBe(1000);
      expect(sortedJobs[1].data.contactIds.length).toBe(1000);

      // Calculate total contacts
      const totalContacts = batchJobs.reduce(
        (sum, job) => sum + job.data.contactIds.length,
        0
      );
      expect(totalContacts).toBe(2000);

      // All batches should be on day 0 (today) - delays should be minimal
      const delays = batchJobs.map((job) => job.opts?.delay ?? 0);
      const dayBuckets = new Set(
        delays.map((d) => Math.floor(d / (24 * 60 * 60 * 1000)))
      );
      expect(dayBuckets.size).toBe(1);
    });
  });

  describe("Edge cases", () => {
    test("should handle broadcast with no recipients", async () => {
      // Create fresh workspace for this test
      const testWorkspace = createTestWorkspace();
      workspacesToCleanup.push(testWorkspace.id);

      const domain = await createTestDomain(testWorkspace.id, {
        name: `empty-${Date.now()}.example.com`,
        maxSendPerDay: 100,
        maxSendPerHour: 10,
      });

      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        domain.id
      );

      const broadcast = await createTestBroadcast(
        testWorkspace.id,
        senderIdentity.id,
        domain.id
      );

      // Run the job with no contacts
      await sendBroadcast({ broadcastId: broadcast.id }, "test-job-empty");

      // Get batch jobs for THIS broadcast only
      const batchJobs = await getBatchJobsForBroadcast(broadcast.id);

      // Should not dispatch any batch jobs
      expect(batchJobs.length).toBe(0);

      // Broadcast should be marked as SENT (nothing to send)
      const updatedBroadcast = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
      });
      expect(updatedBroadcast?.status).toBe("SENT");
    });

    test("should skip broadcast not in QUEUED_FOR_SENDING status", async () => {
      // Create fresh workspace for this test
      const testWorkspace = createTestWorkspace();
      workspacesToCleanup.push(testWorkspace.id);

      const domain = await createTestDomain(testWorkspace.id, {
        name: `skip-${Date.now()}.example.com`,
        maxSendPerDay: 100,
        maxSendPerHour: 10,
      });

      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        domain.id
      );

      // Create broadcast in DRAFT status
      const broadcast = await prisma.broadcast.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "Draft Broadcast",
          status: "DRAFT",
          senderIdentity: { connect: { id: senderIdentity.id } },
          sendingDomain: { connect: { id: domain.id } },
        },
      });
      broadcastIdsToCleanup.push(broadcast.id);

      // Run the job
      await sendBroadcast({ broadcastId: broadcast.id }, "test-job-draft");

      // Get batch jobs for THIS broadcast only
      const batchJobs = await getBatchJobsForBroadcast(broadcast.id);

      // Should not dispatch any batch jobs
      expect(batchJobs.length).toBe(0);
    });

    test("should throw error for non-existent broadcast", async () => {
      await expect(
        sendBroadcast({ broadcastId: "non-existent-id" }, "test-job-notfound")
      ).rejects.toThrow("Broadcast non-existent-id not found");
    });

    test("should throw error for broadcast without sending domain", async () => {
      // Create fresh workspace for this test
      const testWorkspace = createTestWorkspace();
      workspacesToCleanup.push(testWorkspace.id);

      // Create broadcast without sender identity
      const broadcast = await prisma.broadcast.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "No Domain Broadcast",
          status: "QUEUED_FOR_SENDING",
        },
      });
      broadcastIdsToCleanup.push(broadcast.id);

      await expect(
        sendBroadcast({ broadcastId: broadcast.id }, "test-job-nodomain")
      ).rejects.toThrow("has no sending domain");
    });
  });

  describe("Contact ID snapshotting", () => {
    test("should include correct contact IDs in batch payloads", async () => {
      // Create fresh workspace for this test
      const testWorkspace = createTestWorkspace();
      workspacesToCleanup.push(testWorkspace.id);

      const domain = await createTestDomain(testWorkspace.id, {
        name: `snapshot-${Date.now()}.example.com`,
        maxSendPerDay: 100,
        maxSendPerHour: 50,
      });

      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        domain.id
      );

      const broadcast = await createTestBroadcast(
        testWorkspace.id,
        senderIdentity.id,
        domain.id
      );

      // Create specific contacts
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: `snapshot1-${Date.now()}@example.com`, status: "SUBSCRIBED" },
        { email: `snapshot2-${Date.now()}@example.com`, status: "SUBSCRIBED" },
        { email: `snapshot3-${Date.now()}@example.com`, status: "SUBSCRIBED" },
      ]);

      const contactIds = contacts.map((c) => c.id);

      // Run the job
      await sendBroadcast({ broadcastId: broadcast.id }, "test-job-snapshot");

      // Get batch jobs for THIS broadcast only
      const batchJobs = await getBatchJobsForBroadcast(broadcast.id);

      // Collect all contact IDs from batch jobs
      const allDispatchedContactIds = batchJobs.flatMap(
        (job) => job.data.contactIds
      );

      // All original contacts should be in the dispatched jobs
      for (const contactId of contactIds) {
        expect(allDispatchedContactIds).toContain(contactId);
      }

      // Should have exactly 3 contacts
      expect(allDispatchedContactIds.length).toBe(3);
    });
  });
});
