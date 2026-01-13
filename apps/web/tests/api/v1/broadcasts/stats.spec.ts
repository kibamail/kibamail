/**
 * Integration tests for Broadcast Stats Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/broadcasts/[broadcastId]/stats - Get aggregate statistics
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET as GetStats } from "@/app/(main)/api/v1/broadcasts/[broadcastId]/stats/route";
import { POST as CreateBroadcast } from "@/app/(main)/api/v1/broadcasts/route";
import { ErrorCode } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  get,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test broadcast
 */
async function createTestBroadcast(apiKey: CreatedApiKey, name: string) {
  const request = post("/broadcasts", { name }, apiKey.key);
  const response = await CreateBroadcast(request);
  return await response.json();
}

/**
 * Helper to set broadcast aggregate stats
 */
async function setBroadcastStats(
  broadcastId: string,
  stats: {
    totalQueued?: number;
    totalSent?: number;
    totalDelivered?: number;
    totalOpened?: number;
    totalClicked?: number;
    totalBounced?: number;
    totalComplained?: number;
    totalFailed?: number;
    totalUnsubscribed?: number;
    detailsPruned?: boolean;
  },
) {
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: stats,
  });
}

/**
 * Setup: Create a test workspace and API key
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/broadcasts/[broadcastId]/stats", () => {
  describe("Basic functionality", () => {
    test("should return stats for a broadcast with no sends (all zeros)", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Empty Stats Broadcast",
      );

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.object).toBe("broadcast_stats");
      expect(responseData.broadcastId).toBe(broadcast.id);

      // Recipients should all be zero
      expect(responseData.recipients.total).toBe(0);
      expect(responseData.recipients.queued).toBe(0);
      expect(responseData.recipients.sent).toBe(0);
      expect(responseData.recipients.delivered).toBe(0);
      expect(responseData.recipients.bounced).toBe(0);
      expect(responseData.recipients.complained).toBe(0);
      expect(responseData.recipients.failed).toBe(0);
      expect(responseData.recipients.unsubscribed).toBe(0);

      // Engagement should all be zero
      expect(responseData.engagement.opened).toBe(0);
      expect(responseData.engagement.clicked).toBe(0);
      expect(responseData.engagement.openRate).toBe(0);
      expect(responseData.engagement.clickRate).toBe(0);
      expect(responseData.engagement.clickToOpenRate).toBe(0);

      // Deliverability should all be zero
      expect(responseData.deliverability.deliveryRate).toBe(0);
      expect(responseData.deliverability.bounceRate).toBe(0);
      expect(responseData.deliverability.complaintRate).toBe(0);

      expect(responseData.detailsPruned).toBe(false);
    });

    test("should return correct aggregate stats", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Aggregate Stats Broadcast",
      );

      await setBroadcastStats(broadcast.id, {
        totalQueued: 1000,
        totalSent: 1000,
        totalDelivered: 950,
        totalOpened: 400,
        totalClicked: 100,
        totalBounced: 30,
        totalComplained: 5,
        totalFailed: 15,
        totalUnsubscribed: 10,
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);

      // Check recipients
      expect(responseData.recipients.total).toBe(1000);
      expect(responseData.recipients.queued).toBe(0); // totalQueued - totalSent
      expect(responseData.recipients.sent).toBe(1000);
      expect(responseData.recipients.delivered).toBe(950);
      expect(responseData.recipients.bounced).toBe(30);
      expect(responseData.recipients.complained).toBe(5);
      expect(responseData.recipients.failed).toBe(15);
      expect(responseData.recipients.unsubscribed).toBe(10);

      // Check engagement
      expect(responseData.engagement.opened).toBe(400);
      expect(responseData.engagement.clicked).toBe(100);
    });

    test("should return correct engagement metrics", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Engagement Stats Broadcast",
      );

      await setBroadcastStats(broadcast.id, {
        totalQueued: 100,
        totalSent: 100,
        totalDelivered: 100,
        totalOpened: 40,
        totalClicked: 12,
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);

      // openRate = 40/100 = 0.4
      expect(responseData.engagement.openRate).toBe(0.4);
      // clickRate = 12/100 = 0.12
      expect(responseData.engagement.clickRate).toBe(0.12);
      // clickToOpenRate = 12/40 = 0.3
      expect(responseData.engagement.clickToOpenRate).toBe(0.3);
    });

    test("should return correct deliverability metrics", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Deliverability Stats Broadcast",
      );

      await setBroadcastStats(broadcast.id, {
        totalQueued: 100,
        totalSent: 100,
        totalDelivered: 95,
        totalBounced: 3,
        totalComplained: 1,
        totalFailed: 2,
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);

      // deliveryRate = 95/100 = 0.95
      expect(responseData.deliverability.deliveryRate).toBe(0.95);
      // bounceRate = 3/100 = 0.03
      expect(responseData.deliverability.bounceRate).toBe(0.03);
      // complaintRate = 1/95 ≈ 0.0105
      expect(responseData.deliverability.complaintRate).toBeCloseTo(0.0105, 3);
    });
  });

  describe("Rate calculations", () => {
    test("should calculate openRate correctly (opened / delivered)", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "OpenRate Broadcast",
      );

      await setBroadcastStats(broadcast.id, {
        totalQueued: 200,
        totalSent: 200,
        totalDelivered: 180,
        totalOpened: 90,
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      // 90 / 180 = 0.5
      expect(responseData.engagement.openRate).toBe(0.5);
    });

    test("should calculate clickRate correctly (clicked / delivered)", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "ClickRate Broadcast",
      );

      await setBroadcastStats(broadcast.id, {
        totalQueued: 200,
        totalSent: 200,
        totalDelivered: 200,
        totalClicked: 50,
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      // 50 / 200 = 0.25
      expect(responseData.engagement.clickRate).toBe(0.25);
    });

    test("should calculate clickToOpenRate correctly (clicked / opened)", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "ClickToOpenRate Broadcast",
      );

      await setBroadcastStats(broadcast.id, {
        totalQueued: 200,
        totalSent: 200,
        totalDelivered: 200,
        totalOpened: 80,
        totalClicked: 40,
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      // 40 / 80 = 0.5
      expect(responseData.engagement.clickToOpenRate).toBe(0.5);
    });

    test("should handle division by zero (return 0 when no sends)", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Zero Division Broadcast",
      );

      // totalSent = 0, totalDelivered = 0, totalOpened = 0
      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.engagement.openRate).toBe(0);
      expect(responseData.engagement.clickRate).toBe(0);
      expect(responseData.engagement.clickToOpenRate).toBe(0);
      expect(responseData.deliverability.deliveryRate).toBe(0);
      expect(responseData.deliverability.bounceRate).toBe(0);
      expect(responseData.deliverability.complaintRate).toBe(0);
    });
  });

  describe("Authorization", () => {
    test("should return 404 for non-existent broadcast", async () => {
      const request = get(
        "/broadcasts/non_existent_id/stats",
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: "non_existent_id" });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);
    });

    test("should return 404 for broadcast from different workspace", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Cross Workspace Stats Broadcast",
      );

      // Create different workspace
      const otherWorkspace = createTestWorkspace();
      const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        otherApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);

      await cleanupWorkspace(otherWorkspace.id);
    });

    test("should reject request without read:broadcasts scope", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Scope Test Stats Broadcast",
      );

      const writeOnlyApiKey = await createTestApiKey({
        workspaceId: testWorkspace.id,
        scopes: ["write:broadcasts"],
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        writeOnlyApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    });
  });

  describe("detailsPruned flag", () => {
    test("should return detailsPruned: false for fresh broadcasts", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Fresh Broadcast",
      );

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.detailsPruned).toBe(false);
    });

    test("should return detailsPruned: true when details have been pruned", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Pruned Stats Broadcast",
      );

      await setBroadcastStats(broadcast.id, {
        totalQueued: 1000,
        totalSent: 1000,
        totalDelivered: 950,
        detailsPruned: true,
      });

      const request = get(
        `/broadcasts/${broadcast.id}/stats`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await GetStats(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.detailsPruned).toBe(true);
      // Stats should still be available even when details are pruned
      expect(responseData.recipients.total).toBe(1000);
      expect(responseData.recipients.delivered).toBe(950);
    });
  });
});
