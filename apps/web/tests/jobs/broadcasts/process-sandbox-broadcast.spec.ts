/**
 * Integration tests for Process Sandbox Broadcast Job
 *
 * Tests that the process-sandbox-broadcast job correctly:
 * - Creates Queued events for sandbox emails
 * - Generates appropriate event sequences based on sandbox outcome
 * - Processes MTA events through the normal pipeline
 * - Updates broadcast status when all sends complete
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { processSandboxBroadcast } from "@/jobs/broadcasts/process-sandbox-broadcast";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestContacts,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
const broadcastsToCleanup: string[] = [];

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  // Clean up broadcasts
  for (const broadcastId of broadcastsToCleanup) {
    await prisma.event.deleteMany({ where: { broadcastId } });
    await prisma.broadcast.deleteMany({ where: { id: broadcastId } });
  }
  await cleanupWorkspace(testWorkspace.id);
});

async function createTestBroadcast(workspaceId: string) {
  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: "Test Sandbox Broadcast",
      status: "SENDING",
      emailContent: {
        create: {
          subject: "Test Subject",
          contentHtml: "<p>Test content</p>",
        },
      },
    },
  });
  broadcastsToCleanup.push(broadcast.id);
  return broadcast;
}

describe("processSandboxBroadcast job", () => {
  describe("Event generation", () => {
    test("should generate delivered events for delivered@kibamail.dev", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "delivered@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_delivered_${Date.now()}`,
          email: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-delivered",
      );

      // Check events were created
      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
        orderBy: { createdAt: "asc" },
      });

      // Should have: Queued, Reception, Delivery
      expect(events.length).toBeGreaterThanOrEqual(3);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("Queued");
      expect(eventTypes).toContain("Reception");
      expect(eventTypes).toContain("Delivery");
    });

    test("should generate bounce events for bounced@kibamail.dev", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "bounced@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_bounced_${Date.now()}`,
          email: "bounced@kibamail.dev",
          sandboxOutcome: "bounced",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-bounced",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
        orderBy: { createdAt: "asc" },
      });

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("Queued");
      expect(eventTypes).toContain("Reception");
      expect(eventTypes).toContain("Bounce");
    });

    test("should generate open events for opened@kibamail.dev", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "opened@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_opened_${Date.now()}`,
          email: "opened@kibamail.dev",
          sandboxOutcome: "opened",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-opened",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
        orderBy: { createdAt: "asc" },
      });

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("Queued");
      expect(eventTypes).toContain("Reception");
      expect(eventTypes).toContain("Delivery");
      expect(eventTypes).toContain("Open");
    });

    test("should generate click events for clicked@kibamail.dev", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "clicked@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_clicked_${Date.now()}`,
          email: "clicked@kibamail.dev",
          sandboxOutcome: "clicked",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-clicked",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
        orderBy: { createdAt: "asc" },
      });

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("Queued");
      expect(eventTypes).toContain("Reception");
      expect(eventTypes).toContain("Delivery");
      expect(eventTypes).toContain("Open");
      expect(eventTypes).toContain("Click");
    });

    test("should generate feedback events for complained@kibamail.dev", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "complained@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_complained_${Date.now()}`,
          email: "complained@kibamail.dev",
          sandboxOutcome: "complained",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-complained",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
        orderBy: { createdAt: "asc" },
      });

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("Queued");
      expect(eventTypes).toContain("Reception");
      expect(eventTypes).toContain("Delivery");
      expect(eventTypes).toContain("Feedback");
    });

    test("should generate rejection events for failed@kibamail.dev", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "failed@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_failed_${Date.now()}`,
          email: "failed@kibamail.dev",
          sandboxOutcome: "failed",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-failed",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
        orderBy: { createdAt: "asc" },
      });

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("Queued");
      expect(eventTypes).toContain("Rejection");
    });
  });

  describe("Event metadata", () => {
    test("should set correct sendingId on all events", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "delivered-meta@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_meta_${Date.now()}`,
          email: "delivered-meta@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-meta",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
      });

      // All events should have the same sendingId (starting with bs_)
      const sendingIds = [...new Set(events.map((e) => e.sendingId))];
      expect(sendingIds.length).toBe(1);
      expect(sendingIds[0]).toMatch(/^bs_/);
    });

    test("should set nodeId to sandbox", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "delivered-node@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_node_${Date.now()}`,
          email: "delivered-node@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-node",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
      });

      for (const event of events) {
        expect(event.nodeId).toBe("sandbox");
      }
    });
  });

  describe("Unknown outcomes", () => {
    test("should default to delivered sequence for unknown outcomes", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "unknown@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_unknown_${Date.now()}`,
          email: "unknown@kibamail.dev",
          sandboxOutcome: "unknown-outcome",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-unknown",
      );

      const events = await prisma.event.findMany({
        where: { broadcastId: broadcast.id },
        orderBy: { createdAt: "asc" },
      });

      // Should default to delivered sequence
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("Queued");
      expect(eventTypes).toContain("Reception");
      expect(eventTypes).toContain("Delivery");
    });
  });

  describe("Broadcast status updates", () => {
    test("should update broadcast to SENT when all sends complete", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "complete@kibamail.dev", status: "SUBSCRIBED" },
      ]);

      await processSandboxBroadcast(
        {
          broadcastId: broadcast.id,
          workspaceId: testWorkspace.id,
          sendingId: `bs_test_complete_${Date.now()}`,
          email: "complete@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Subject",
          htmlBody: "<p>Test</p>",
        },
        "test-job-complete",
      );

      // Check broadcast status
      const updatedBroadcast = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
      });

      expect(updatedBroadcast?.status).toBe("SENT");
    });
  });
});
