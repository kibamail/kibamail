/**
 * Integration tests for Broadcast Sends Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/broadcasts/[broadcastId]/sends - List sends with pagination
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET as ListSends } from "@/app/(main)/api/v1/broadcasts/[broadcastId]/sends/route";
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
 * Helper to create test sends for a broadcast
 */
async function createTestSends(
  broadcastId: string,
  workspaceId: string,
  sends: Array<{
    email: string;
    status: string;
    openCount?: number;
    clickCount?: number;
  }>,
) {
  const now = new Date();
  await prisma.broadcastSend.createMany({
    data: sends.map((send, index) => ({
      broadcastId,
      workspaceId,
      email: send.email,
      sendingId: `test_${broadcastId}_${index}_${Date.now()}`,
      status: send.status as "QUEUED" | "SENDING" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED",
      queuedAt: now,
      sentAt: send.status !== "QUEUED" ? now : null,
      deliveredAt: send.status === "DELIVERED" ? now : null,
      bouncedAt: send.status === "BOUNCED" ? now : null,
      complainedAt: send.status === "COMPLAINED" ? now : null,
      openCount: send.openCount ?? 0,
      clickCount: send.clickCount ?? 0,
      uniqueLinksClicked: 0,
    })),
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

describe("GET /api/v1/broadcasts/[broadcastId]/sends", () => {
  describe("Basic functionality", () => {
    test("should return empty list for broadcast with no sends", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Empty Sends Broadcast",
      );

      const request = get(
        `/broadcasts/${broadcast.id}/sends`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.object).toBe("broadcast_send_list");
      expect(responseData.data).toEqual([]);
      expect(responseData.hasMore).toBe(false);
    });

    test("should return sends for a broadcast with sends", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "With Sends Broadcast",
      );

      await createTestSends(broadcast.id, testWorkspace.id, [
        { email: "user1@example.com", status: "DELIVERED" },
        { email: "user2@example.com", status: "DELIVERED" },
      ]);

      const request = get(
        `/broadcasts/${broadcast.id}/sends`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.object).toBe("broadcast_send_list");
      expect(responseData.data.length).toBe(2);
    });

    test("should return correct send fields", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Fields Test Broadcast",
      );

      await createTestSends(broadcast.id, testWorkspace.id, [
        { email: "fieldtest@example.com", status: "DELIVERED", openCount: 3, clickCount: 1 },
      ]);

      const request = get(
        `/broadcasts/${broadcast.id}/sends`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      const send = responseData.data[0];

      expect(send).toHaveProperty("id");
      expect(send).toHaveProperty("email", "fieldtest@example.com");
      expect(send).toHaveProperty("status", "DELIVERED");
      expect(send).toHaveProperty("queuedAt");
      expect(send).toHaveProperty("sentAt");
      expect(send).toHaveProperty("deliveredAt");
      expect(send).toHaveProperty("firstOpenedAt");
      expect(send).toHaveProperty("firstClickedAt");
      expect(send).toHaveProperty("bouncedAt");
      expect(send).toHaveProperty("complainedAt");
      expect(send).toHaveProperty("openCount", 3);
      expect(send).toHaveProperty("clickCount", 1);
      expect(send).toHaveProperty("uniqueLinksClicked", 0);
      expect(send).toHaveProperty("bounceClassification");
      expect(send).toHaveProperty("lastResponseCode");
      expect(send).toHaveProperty("lastResponseMessage");
    });
  });

  describe("Pagination", () => {
    test("should paginate sends with limit", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Paginate Sends Broadcast",
      );

      await createTestSends(broadcast.id, testWorkspace.id, [
        { email: "page1@example.com", status: "DELIVERED" },
        { email: "page2@example.com", status: "DELIVERED" },
        { email: "page3@example.com", status: "DELIVERED" },
        { email: "page4@example.com", status: "DELIVERED" },
        { email: "page5@example.com", status: "DELIVERED" },
      ]);

      const request = get(
        `/broadcasts/${broadcast.id}/sends?limit=2`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.length).toBe(2);
      expect(responseData.hasMore).toBe(true);
    });

    test("should paginate with after cursor", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Cursor Sends Broadcast",
      );

      await createTestSends(broadcast.id, testWorkspace.id, [
        { email: "cursor1@example.com", status: "DELIVERED" },
        { email: "cursor2@example.com", status: "DELIVERED" },
        { email: "cursor3@example.com", status: "DELIVERED" },
      ]);

      // First page
      const firstRequest = get(
        `/broadcasts/${broadcast.id}/sends?limit=1`,
        fullAccessApiKey.key,
      );
      const firstParams = Promise.resolve({ broadcastId: broadcast.id });
      const firstResponse = await ListSends(firstRequest, { params: firstParams });
      const firstData = await firstResponse.json();

      expect(firstData.data.length).toBe(1);
      const firstId = firstData.data[0].id;

      // Second page
      const secondRequest = get(
        `/broadcasts/${broadcast.id}/sends?limit=1&after=${firstId}`,
        fullAccessApiKey.key,
      );
      const secondParams = Promise.resolve({ broadcastId: broadcast.id });
      const secondResponse = await ListSends(secondRequest, { params: secondParams });
      const secondData = await secondResponse.json();

      expect(secondResponse.status).toBe(200);
      expect(secondData.data.length).toBe(1);
      expect(secondData.data[0].id).not.toBe(firstId);
    });
  });

  describe("Filtering", () => {
    test("should filter sends by status", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Filter Status Broadcast",
      );

      await createTestSends(broadcast.id, testWorkspace.id, [
        { email: "delivered@example.com", status: "DELIVERED" },
        { email: "bounced@example.com", status: "BOUNCED" },
        { email: "complained@example.com", status: "COMPLAINED" },
      ]);

      const request = get(
        `/broadcasts/${broadcast.id}/sends?status=BOUNCED`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.length).toBe(1);
      expect(responseData.data[0].status).toBe("BOUNCED");
      expect(responseData.data[0].email).toBe("bounced@example.com");
    });

    test("should return empty when no sends match filter", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "No Match Filter Broadcast",
      );

      await createTestSends(broadcast.id, testWorkspace.id, [
        { email: "delivered@example.com", status: "DELIVERED" },
      ]);

      const request = get(
        `/broadcasts/${broadcast.id}/sends?status=BOUNCED`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data).toEqual([]);
    });
  });

  describe("Authorization", () => {
    test("should return 404 for non-existent broadcast", async () => {
      const request = get(
        "/broadcasts/non_existent_id/sends",
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: "non_existent_id" });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);
    });

    test("should return 404 for broadcast from different workspace", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Cross Workspace Sends Broadcast",
      );

      // Create different workspace
      const otherWorkspace = createTestWorkspace();
      const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

      const request = get(
        `/broadcasts/${broadcast.id}/sends`,
        otherApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);

      await cleanupWorkspace(otherWorkspace.id);
    });

    test("should reject request without read:broadcasts scope", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Scope Test Sends Broadcast",
      );

      const writeOnlyApiKey = await createTestApiKey({
        workspaceId: testWorkspace.id,
        scopes: ["write:broadcasts"],
      });

      const request = get(
        `/broadcasts/${broadcast.id}/sends`,
        writeOnlyApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    });
  });

  describe("Edge cases", () => {
    test("should return 400 if broadcast details have been pruned", async () => {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        "Pruned Sends Broadcast",
      );

      // Mark broadcast as pruned
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { detailsPruned: true },
      });

      const request = get(
        `/broadcasts/${broadcast.id}/sends`,
        fullAccessApiKey.key,
      );
      const params = Promise.resolve({ broadcastId: broadcast.id });

      const response = await ListSends(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe(ErrorCode.BROADCAST_DETAILS_PRUNED);
    });
  });
});
