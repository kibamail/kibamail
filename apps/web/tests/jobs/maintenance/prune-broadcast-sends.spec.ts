/**
 * Integration tests for Prune Broadcast Sends Job
 *
 * Tests the pruning job that deletes BroadcastSend records older than
 * the retention period while preserving aggregate stats on Broadcast.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { pruneBroadcastSends } from "@/jobs/maintenance/prune-broadcast-sends";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

// Helper to create a test Broadcast with a specific createdAt date
async function createTestBroadcast(
  workspaceId: string,
  status: "DRAFT" | "SENDING" | "SENT" = "SENT",
  daysAgo: number = 0
) {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);

  // Create broadcast first with defaults
  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: `Test Broadcast ${Date.now()}`,
      status,
      // Aggregate fields use defaults from schema
    },
  });

  // Update createdAt and set aggregate stats for pruning tests
  return prisma.broadcast.update({
    where: { id: broadcast.id },
    data: {
      createdAt,
      totalQueued: 10,
      totalSent: 10,
      totalDelivered: 8,
      totalBounced: 1,
      totalComplained: 1,
      totalOpened: 5,
      totalClicked: 3,
    },
  });
}

// Helper to create a test Contact
async function createTestContact(workspaceId: string) {
  return prisma.contact.create({
    data: {
      workspaceId,
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      status: "SUBSCRIBED",
    },
  });
}

// Helper to create test BroadcastSend records
async function createTestBroadcastSends(
  broadcastId: string,
  workspaceId: string,
  count: number
) {
  const contacts = await Promise.all(
    Array.from({ length: count }, () => createTestContact(workspaceId))
  );

  const sends = await Promise.all(
    contacts.map((contact, i) =>
      prisma.broadcastSend.create({
        data: {
          broadcastId,
          contactId: contact.id,
          workspaceId,
          sendingId: `test-send-${broadcastId}-${i}-${Date.now()}`,
          email: contact.email,
          status: "DELIVERED",
          queuedAt: new Date(),
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      })
    )
  );

  return sends;
}

describe("Prune Broadcast Sends Job", () => {
  test("should prune BroadcastSend records for broadcasts older than retention period", async () => {
    // Create a broadcast that's 90 days old (older than 60-day retention)
    const oldBroadcast = await createTestBroadcast(testWorkspace.id, "SENT", 90);
    const sends = await createTestBroadcastSends(oldBroadcast.id, testWorkspace.id, 5);

    expect(sends.length).toBe(5);

    // Verify BroadcastSend records exist
    const beforeCount = await prisma.broadcastSend.count({
      where: { broadcastId: oldBroadcast.id },
    });
    expect(beforeCount).toBe(5);

    // Run the pruning job with default 60-day retention
    await pruneBroadcastSends({}, "test-job-id");

    // Verify BroadcastSend records were deleted
    const afterCount = await prisma.broadcastSend.count({
      where: { broadcastId: oldBroadcast.id },
    });
    expect(afterCount).toBe(0);

    // Verify broadcast is marked as pruned
    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: oldBroadcast.id },
    });
    expect(updatedBroadcast?.detailsPruned).toBe(true);
    expect(updatedBroadcast?.statsRecomputedAt).toBeDefined();

    // Verify aggregate stats are preserved
    expect(updatedBroadcast?.totalQueued).toBe(10);
    expect(updatedBroadcast?.totalSent).toBe(10);
    expect(updatedBroadcast?.totalDelivered).toBe(8);
    expect(updatedBroadcast?.totalBounced).toBe(1);
  });

  test("should not prune BroadcastSend records for broadcasts within retention period", async () => {
    // Create a broadcast that's 30 days old (within 60-day retention)
    const recentBroadcast = await createTestBroadcast(testWorkspace.id, "SENT", 30);
    await createTestBroadcastSends(recentBroadcast.id, testWorkspace.id, 3);

    // Verify BroadcastSend records exist
    const beforeCount = await prisma.broadcastSend.count({
      where: { broadcastId: recentBroadcast.id },
    });
    expect(beforeCount).toBe(3);

    // Run the pruning job
    await pruneBroadcastSends({}, "test-job-id");

    // Verify BroadcastSend records were NOT deleted
    const afterCount = await prisma.broadcastSend.count({
      where: { broadcastId: recentBroadcast.id },
    });
    expect(afterCount).toBe(3);

    // Verify broadcast is NOT marked as pruned
    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: recentBroadcast.id },
    });
    expect(updatedBroadcast?.detailsPruned).toBe(false);
  });

  test("should not prune broadcasts that are not in SENT status", async () => {
    // Create a broadcast that's 90 days old but still in SENDING status
    const sendingBroadcast = await createTestBroadcast(testWorkspace.id, "SENDING", 90);
    await createTestBroadcastSends(sendingBroadcast.id, testWorkspace.id, 3);

    // Verify BroadcastSend records exist
    const beforeCount = await prisma.broadcastSend.count({
      where: { broadcastId: sendingBroadcast.id },
    });
    expect(beforeCount).toBe(3);

    // Run the pruning job
    await pruneBroadcastSends({}, "test-job-id");

    // Verify BroadcastSend records were NOT deleted (broadcast not SENT)
    const afterCount = await prisma.broadcastSend.count({
      where: { broadcastId: sendingBroadcast.id },
    });
    expect(afterCount).toBe(3);
  });

  test("should not prune broadcasts that are already pruned", async () => {
    // Create an old broadcast that's already marked as pruned
    const prunedBroadcast = await createTestBroadcast(testWorkspace.id, "SENT", 90);
    await prisma.broadcast.update({
      where: { id: prunedBroadcast.id },
      data: { detailsPruned: true },
    });

    // Create some BroadcastSend records (simulating partial state)
    await createTestBroadcastSends(prunedBroadcast.id, testWorkspace.id, 2);

    const beforeCount = await prisma.broadcastSend.count({
      where: { broadcastId: prunedBroadcast.id },
    });
    expect(beforeCount).toBe(2);

    // Run the pruning job
    await pruneBroadcastSends({}, "test-job-id");

    // Verify BroadcastSend records were NOT deleted (already pruned)
    const afterCount = await prisma.broadcastSend.count({
      where: { broadcastId: prunedBroadcast.id },
    });
    expect(afterCount).toBe(2);
  });

  test("should respect custom retention period", async () => {
    // Create a broadcast that's 45 days old
    const broadcast45Days = await createTestBroadcast(testWorkspace.id, "SENT", 45);
    await createTestBroadcastSends(broadcast45Days.id, testWorkspace.id, 3);

    // Run pruning with 30-day retention (should prune 45-day-old broadcast)
    await pruneBroadcastSends({ retentionDays: 30 }, "test-job-id");

    // Verify BroadcastSend records were deleted
    const afterCount = await prisma.broadcastSend.count({
      where: { broadcastId: broadcast45Days.id },
    });
    expect(afterCount).toBe(0);

    // Verify broadcast is marked as pruned
    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: broadcast45Days.id },
    });
    expect(updatedBroadcast?.detailsPruned).toBe(true);
  });

  test("should handle broadcasts with no BroadcastSend records", async () => {
    // Create an old broadcast with no sends
    const emptyBroadcast = await createTestBroadcast(testWorkspace.id, "SENT", 90);

    // Run the pruning job
    await pruneBroadcastSends({}, "test-job-id");

    // Verify broadcast is marked as pruned (even with no sends to delete)
    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: emptyBroadcast.id },
    });
    expect(updatedBroadcast?.detailsPruned).toBe(true);
  });

  test("should process multiple broadcasts in batch", async () => {
    // Create multiple old broadcasts
    const broadcast1 = await createTestBroadcast(testWorkspace.id, "SENT", 100);
    const broadcast2 = await createTestBroadcast(testWorkspace.id, "SENT", 80);
    const broadcast3 = await createTestBroadcast(testWorkspace.id, "SENT", 70);

    await createTestBroadcastSends(broadcast1.id, testWorkspace.id, 2);
    await createTestBroadcastSends(broadcast2.id, testWorkspace.id, 2);
    await createTestBroadcastSends(broadcast3.id, testWorkspace.id, 2);

    // Run the pruning job
    await pruneBroadcastSends({}, "test-job-id");

    // Verify all broadcasts are pruned
    const updatedBroadcast1 = await prisma.broadcast.findUnique({
      where: { id: broadcast1.id },
    });
    const updatedBroadcast2 = await prisma.broadcast.findUnique({
      where: { id: broadcast2.id },
    });
    const updatedBroadcast3 = await prisma.broadcast.findUnique({
      where: { id: broadcast3.id },
    });

    expect(updatedBroadcast1?.detailsPruned).toBe(true);
    expect(updatedBroadcast2?.detailsPruned).toBe(true);
    expect(updatedBroadcast3?.detailsPruned).toBe(true);

    // Verify all BroadcastSend records were deleted
    const totalSends = await prisma.broadcastSend.count({
      where: {
        broadcastId: { in: [broadcast1.id, broadcast2.id, broadcast3.id] },
      },
    });
    expect(totalSends).toBe(0);
  });
});
