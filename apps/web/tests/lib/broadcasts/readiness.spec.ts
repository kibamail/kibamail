/**
 * Integration tests for Broadcast Readiness Checker
 *
 * Tests the BroadcastReadinessChecker class which validates
 * that a broadcast has all required configuration before sending.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type {
  Broadcast,
  EmailContent,
  SendingDomain,
  SenderIdentity,
} from "@prisma/client";
import { POST as CreateDomain } from "@/app/api/v1/domains/route";
import { POST as CreateBroadcast } from "@/app/api/v1/broadcasts/route";
import {
  checkBroadcastReadiness,
  getReadinessErrors,
} from "@/lib/broadcasts/readiness";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestContacts,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

type BroadcastWithRelations = Broadcast & {
  emailContent: EmailContent | null;
  senderIdentity:
    | (SenderIdentity & {
        sendingDomain: SendingDomain | null;
      })
    | null;
  sendingDomain: SendingDomain | null;
};

/**
 * Helper to create a broadcast via the API and return it with relations
 */
async function createBroadcastViaApi(
  apiKey: CreatedApiKey,
  data: {
    name: string;
    from?: string;
    emailContent?: {
      subject?: string;
      text?: string;
      html?: string;
    };
  }
): Promise<BroadcastWithRelations> {
  const request = post("/broadcasts", data, apiKey.key);
  const response = await CreateBroadcast(request);
  const json = await response.json();

  // Fetch with relations
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: json.id },
    include: {
      emailContent: true,
      senderIdentity: { include: { sendingDomain: true } },
      sendingDomain: true,
    },
  });

  return broadcast!;
}

/**
 * Helper to create and verify a domain via API
 */
async function createVerifiedDomainViaApi(
  apiKey: CreatedApiKey,
  name: string
): Promise<SendingDomain> {
  const request = post("/domains", { name }, apiKey.key);
  const response = await CreateDomain(request);
  const json = await response.json();

  // Mark as verified
  const domain = await prisma.sendingDomain.update({
    where: { id: json.id },
    data: {
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
    },
  });

  return domain;
}

/**
 * Helper to create an unverified domain via API
 */
async function createUnverifiedDomainViaApi(
  apiKey: CreatedApiKey,
  name: string
): Promise<SendingDomain> {
  const request = post("/domains", { name }, apiKey.key);
  const response = await CreateDomain(request);
  const json = await response.json();

  return prisma.sendingDomain.findUnique({
    where: { id: json.id },
  }) as Promise<SendingDomain>;
}

/**
 * Helper to create a broadcast directly in DB without sender identity
 */
async function createMinimalBroadcast(
  workspaceId: string,
  overrides: {
    name?: string;
    sendAt?: Date | null;
    topicId?: string | null;
    segmentId?: string | null;
    senderIdentityId?: string | null;
    sendingDomainId?: string | null;
    emailContent?: {
      subject?: string | null;
      contentHtml?: string | null;
    } | null;
  } = {}
): Promise<BroadcastWithRelations> {
  let emailContentId: string | undefined;

  if (overrides.emailContent) {
    const emailContent = await prisma.emailContent.create({
      data: {
        subject: overrides.emailContent.subject ?? null,
        contentHtml: overrides.emailContent.contentHtml ?? null,
      },
    });
    emailContentId = emailContent.id;
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: overrides.name ?? "Test Broadcast",
      sendAt: overrides.sendAt ?? null,
      topicId: overrides.topicId ?? null,
      segmentId: overrides.segmentId ?? null,
      senderIdentityId: overrides.senderIdentityId ?? null,
      sendingDomainId: overrides.sendingDomainId ?? null,
      emailContentId,
    },
    include: {
      emailContent: true,
      senderIdentity: { include: { sendingDomain: true } },
      sendingDomain: true,
    },
  });

  return broadcast;
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

describe("BroadcastReadinessChecker", () => {
  describe("checkBroadcastReadiness", () => {
    test("should return not ready when broadcast has no sender identity", async () => {
      const broadcast = await createMinimalBroadcast(testWorkspace.id, {
        name: "No Sender Broadcast",
        sendAt: new Date(Date.now() + 3600000),
        emailContent: {
          subject: "Test Subject",
          contentHtml: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
        },
      });

      // Create contacts for recipients check
      await createTestContacts(testWorkspace.id, [
        { email: "nosender@example.com", status: "SUBSCRIBED" },
      ]);

      const result = await checkBroadcastReadiness(testWorkspace.id, broadcast);

      expect(result.ready).toBe(false);
      const fromEmailCheck = result.checklist.find(
        (item) => item.id === "from_email"
      );
      expect(fromEmailCheck?.completed).toBe(false);
      expect(fromEmailCheck?.reason).toContain("No sender email configured");
    });

    test("should return not ready when domain is not verified", async () => {
      // Create unverified domain via API
      const unverifiedDomain = await createUnverifiedDomainViaApi(
        fullAccessApiKey,
        "unverified-readiness.example.com"
      );

      // Create sender identity manually
      const senderIdentity = await prisma.senderIdentity.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "test",
          email: "test",
          sendingDomainId: unverifiedDomain.id,
          emailVerifiedAt: new Date(),
        },
      });

      const broadcast = await createMinimalBroadcast(testWorkspace.id, {
        name: "Unverified Domain Broadcast",
        senderIdentityId: senderIdentity.id,
        sendingDomainId: unverifiedDomain.id,
        sendAt: new Date(Date.now() + 3600000),
        emailContent: {
          subject: "Test Subject",
          contentHtml: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
        },
      });

      // Refetch to get relations
      const broadcastWithRelations = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        include: {
          emailContent: true,
          senderIdentity: { include: { sendingDomain: true } },
          sendingDomain: true,
        },
      });

      const result = await checkBroadcastReadiness(
        testWorkspace.id,
        broadcastWithRelations!
      );

      expect(result.ready).toBe(false);
      const fromEmailCheck = result.checklist.find(
        (item) => item.id === "from_email"
      );
      expect(fromEmailCheck?.completed).toBe(false);
      expect(fromEmailCheck?.reason).toContain("not fully verified");
    });

    test("should return not ready when subject is missing", async () => {
      await createVerifiedDomainViaApi(
        fullAccessApiKey,
        "subject-test.example.com"
      );

      // Create broadcast via API without subject
      const broadcast = await createBroadcastViaApi(fullAccessApiKey, {
        name: "No Subject Broadcast",
        from: "news@subject-test.example.com",
      });

      // Set sendAt
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { sendAt: new Date(Date.now() + 3600000) },
      });

      // Refetch
      const broadcastWithRelations = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        include: {
          emailContent: true,
          senderIdentity: { include: { sendingDomain: true } },
          sendingDomain: true,
        },
      });

      const result = await checkBroadcastReadiness(
        testWorkspace.id,
        broadcastWithRelations!
      );

      expect(result.ready).toBe(false);
      const subjectCheck = result.checklist.find(
        (item) => item.id === "subject"
      );
      expect(subjectCheck?.completed).toBe(false);
      expect(subjectCheck?.reason).toContain("No subject line set");
    });

    test("should return not ready when unsubscribe link is missing", async () => {
      await createVerifiedDomainViaApi(
        fullAccessApiKey,
        "unsub-test.example.com"
      );

      // Create contacts
      await createTestContacts(testWorkspace.id, [
        { email: "nounsub@example.com", status: "SUBSCRIBED" },
      ]);

      const broadcast = await createBroadcastViaApi(fullAccessApiKey, {
        name: "No Unsubscribe Broadcast",
        from: "news@unsub-test.example.com",
        emailContent: {
          subject: "Test Subject",
          html: "<p>Hello without unsubscribe!</p>",
        },
      });

      // Set sendAt
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { sendAt: new Date(Date.now() + 3600000) },
      });

      // Refetch
      const broadcastWithRelations = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        include: {
          emailContent: true,
          senderIdentity: { include: { sendingDomain: true } },
          sendingDomain: true,
        },
      });

      const result = await checkBroadcastReadiness(
        testWorkspace.id,
        broadcastWithRelations!
      );

      expect(result.ready).toBe(false);
      const unsubCheck = result.checklist.find(
        (item) => item.id === "unsubscribe_url"
      );
      expect(unsubCheck?.completed).toBe(false);
      expect(unsubCheck?.reason).toContain("No unsubscribe link");
    });

    test("should return not ready when sendAt is missing", async () => {
      await createVerifiedDomainViaApi(
        fullAccessApiKey,
        "sendat-test.example.com"
      );

      const broadcast = await createBroadcastViaApi(fullAccessApiKey, {
        name: "No SendAt Broadcast",
        from: "news@sendat-test.example.com",
        emailContent: {
          subject: "Test Subject",
          html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
        },
      });

      const result = await checkBroadcastReadiness(testWorkspace.id, broadcast);

      expect(result.ready).toBe(false);
      const sendTimeCheck = result.checklist.find(
        (item) => item.id === "send_time"
      );
      expect(sendTimeCheck?.completed).toBe(false);
      expect(sendTimeCheck?.reason).toContain("No send time scheduled");
    });

    test("should return not ready when no recipients exist", async () => {
      // Create a fresh workspace with no contacts
      const freshWorkspace = createTestWorkspace();
      const freshApiKey = await createFullAccessApiKey(freshWorkspace.id);

      await createVerifiedDomainViaApi(
        freshApiKey,
        "recipients-test.example.com"
      );

      const broadcast = await createBroadcastViaApi(freshApiKey, {
        name: "No Recipients Broadcast",
        from: "news@recipients-test.example.com",
        emailContent: {
          subject: "Test Subject",
          html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
        },
      });

      // Set sendAt
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { sendAt: new Date(Date.now() + 3600000) },
      });

      const broadcastWithRelations = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        include: {
          emailContent: true,
          senderIdentity: { include: { sendingDomain: true } },
          sendingDomain: true,
        },
      });

      const result = await checkBroadcastReadiness(
        freshWorkspace.id,
        broadcastWithRelations!
      );

      expect(result.ready).toBe(false);
      const recipientsCheck = result.checklist.find(
        (item) => item.id === "recipients"
      );
      expect(recipientsCheck?.completed).toBe(false);
      expect(recipientsCheck?.reason).toContain("No recipients");

      await cleanupWorkspace(freshWorkspace.id);
    });

    test("should return ready when all requirements are met", async () => {
      // Create fresh workspace for a clean test
      const freshWorkspace = createTestWorkspace();
      const freshApiKey = await createFullAccessApiKey(freshWorkspace.id);

      await createVerifiedDomainViaApi(freshApiKey, "ready-test.example.com");

      // Create contacts
      await createTestContacts(freshWorkspace.id, [
        { email: "ready1@example.com", status: "SUBSCRIBED" },
        { email: "ready2@example.com", status: "SUBSCRIBED" },
      ]);

      const broadcast = await createBroadcastViaApi(freshApiKey, {
        name: "Ready Broadcast",
        from: "news@ready-test.example.com",
        emailContent: {
          subject: "Test Subject",
          html: '<p>Hello!</p><a href="{{unsubscribe_url}}">Unsubscribe</a>',
        },
      });

      // Set sendAt
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { sendAt: new Date(Date.now() + 3600000) },
      });

      const broadcastWithRelations = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        include: {
          emailContent: true,
          senderIdentity: { include: { sendingDomain: true } },
          sendingDomain: true,
        },
      });

      const result = await checkBroadcastReadiness(
        freshWorkspace.id,
        broadcastWithRelations!
      );

      expect(result.ready).toBe(true);
      expect(result.checklist.every((item) => item.completed)).toBe(true);
      expect(result.recipientCount).toBe(2);
      expect(result.audienceType).toBe("all");

      await cleanupWorkspace(freshWorkspace.id);
    });

    test("should format labels correctly for completed items", async () => {
      const freshWorkspace = createTestWorkspace();
      const freshApiKey = await createFullAccessApiKey(freshWorkspace.id);

      await createVerifiedDomainViaApi(freshApiKey, "label-test.example.com");

      await createTestContacts(freshWorkspace.id, [
        { email: "label-test@example.com", status: "SUBSCRIBED" },
      ]);

      const broadcast = await createBroadcastViaApi(freshApiKey, {
        name: "Label Test Broadcast",
        from: "newsletter@label-test.example.com",
        emailContent: {
          subject: "Test Subject",
          html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
        },
      });

      // Set sendAt
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { sendAt: new Date(Date.now() + 3600000) },
      });

      const broadcastWithRelations = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        include: {
          emailContent: true,
          senderIdentity: { include: { sendingDomain: true } },
          sendingDomain: true,
        },
      });

      const result = await checkBroadcastReadiness(
        freshWorkspace.id,
        broadcastWithRelations!
      );

      // Check from email label
      const fromEmailCheck = result.checklist.find(
        (item) => item.id === "from_email"
      );
      expect(fromEmailCheck?.label).toContain("Send from");
      expect(fromEmailCheck?.label).toContain(
        "newsletter@label-test.example.com"
      );

      // Check send time label
      const sendTimeCheck = result.checklist.find(
        (item) => item.id === "send_time"
      );
      expect(sendTimeCheck?.label).toContain("Send on");

      // Check recipients label
      const recipientsCheck = result.checklist.find(
        (item) => item.id === "recipients"
      );
      expect(recipientsCheck?.label).toContain("Send to");
      expect(recipientsCheck?.label).toContain("1");

      await cleanupWorkspace(freshWorkspace.id);
    });
  });

  describe("getReadinessErrors", () => {
    test("should return array of error messages from incomplete items", async () => {
      const broadcast = await createMinimalBroadcast(testWorkspace.id, {
        name: "Error Messages Broadcast",
        sendAt: null,
        emailContent: null,
      });

      const result = await checkBroadcastReadiness(testWorkspace.id, broadcast);
      const errors = getReadinessErrors(result);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain("No sender email configured");
      expect(errors).toContain("No subject line set");
    });

    test("should return empty array when broadcast is ready", async () => {
      const freshWorkspace = createTestWorkspace();
      const freshApiKey = await createFullAccessApiKey(freshWorkspace.id);

      await createVerifiedDomainViaApi(freshApiKey, "errors-test.example.com");

      await createTestContacts(freshWorkspace.id, [
        { email: "errors-test@example.com", status: "SUBSCRIBED" },
      ]);

      const broadcast = await createBroadcastViaApi(freshApiKey, {
        name: "No Errors Broadcast",
        from: "news@errors-test.example.com",
        emailContent: {
          subject: "Test Subject",
          html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
        },
      });

      // Set sendAt
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { sendAt: new Date(Date.now() + 3600000) },
      });

      const broadcastWithRelations = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        include: {
          emailContent: true,
          senderIdentity: { include: { sendingDomain: true } },
          sendingDomain: true,
        },
      });

      const result = await checkBroadcastReadiness(
        freshWorkspace.id,
        broadcastWithRelations!
      );
      const errors = getReadinessErrors(result);

      expect(errors).toHaveLength(0);

      await cleanupWorkspace(freshWorkspace.id);
    });
  });

  describe("audience type detection", () => {
    test("should detect all contacts audience when no topic or segment", async () => {
      const broadcast = await createMinimalBroadcast(testWorkspace.id, {
        name: "All Contacts Broadcast",
        topicId: null,
        segmentId: null,
      });

      const result = await checkBroadcastReadiness(testWorkspace.id, broadcast);

      expect(result.audienceType).toBe("all");
      expect(result.audienceName).toBeUndefined();
    });

    test("should detect topic audience", async () => {
      const topic = await prisma.topic.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "Test Topic for Readiness",
        },
      });

      const broadcast = await createMinimalBroadcast(testWorkspace.id, {
        name: "Topic Broadcast",
        topicId: topic.id,
      });

      const result = await checkBroadcastReadiness(testWorkspace.id, broadcast);

      expect(result.audienceType).toBe("topic");
      expect(result.audienceName).toBe("Test Topic for Readiness");
    });

    test("should detect segment audience", async () => {
      const segment = await prisma.segment.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "Test Segment for Readiness",
          type: "STATIC",
          conditions: {},
        },
      });

      const broadcast = await createMinimalBroadcast(testWorkspace.id, {
        name: "Segment Broadcast",
        segmentId: segment.id,
      });

      const result = await checkBroadcastReadiness(testWorkspace.id, broadcast);

      expect(result.audienceType).toBe("segment");
      expect(result.audienceName).toBe("Test Segment for Readiness");
    });
  });
});
