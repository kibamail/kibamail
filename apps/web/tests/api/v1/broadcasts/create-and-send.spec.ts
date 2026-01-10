/**
 * Integration tests for Create and Send Broadcast Endpoint (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/broadcasts/create-and-send - Create and send broadcast with raw HTML
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as CreateAndSendBroadcast } from "@/app/(main)/api/v1/broadcasts/create-and-send/route";
import { POST as CreateDomain } from "@/app/(main)/api/v1/domains/route";
import { POST as CreateSegment } from "@/app/(main)/api/v1/segments/route";
import { POST as CreateTopic } from "@/app/(main)/api/v1/topics/route";
import { POST as CreateContact } from "@/app/(main)/api/v1/contacts/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestContacts,
  createTestTopics,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

async function createVerifiedDomain(apiKey: CreatedApiKey, name: string) {
  const request = post("/domains", { name }, apiKey.key);
  const response = await CreateDomain(request);
  const domain = await response.json();

  await prisma.sendingDomain.update({
    where: { id: domain.id },
    data: {
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
    },
  });

  return domain;
}

async function createTestTopic(apiKey: CreatedApiKey, name: string) {
  const request = post("/topics", { name }, apiKey.key);
  const response = await CreateTopic(request);
  return await response.json();
}

async function createTestSegment(apiKey: CreatedApiKey, name: string) {
  const request = post(
    "/segments",
    {
      name,
      conditions: { field: "status", operator: "eq", value: "SUBSCRIBED" },
    },
    apiKey.key,
  );
  const response = await CreateSegment(request);
  return await response.json();
}

function getFutureDate(hoursFromNow: number = 1): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

function getPastDate(hoursAgo: number = 1): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/broadcasts/create-and-send", () => {
  describe("Basic creation and scheduling", () => {
    test("should create and schedule broadcast to contacts by ID", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "create-and-send.example.com",
      );

      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "recipient1@create-send.com", status: "SUBSCRIBED" },
        { email: "recipient2@create-send.com", status: "SUBSCRIBED" },
      ]);

      const broadcastData = {
        name: "Create and Send Test",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Hello {{firstName}}!",
          html: "<p>Hi {{firstName}}, welcome to our service!</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
        },
        recipients: {
          contacts: contacts.map((c) => c.id),
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");
      expect(responseData.id).toBeDefined();
    });

    test("should create and schedule broadcast to emails (upserts contacts)", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "email-upsert.example.com",
      );

      const broadcastData = {
        name: "Email Upsert Test",
        from: `team@${domain.name}`,
        emailContent: {
          subject: "Welcome {{email}}!",
          html: "<p>Thanks for joining, {{email}}!</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
        },
        recipients: {
          emails: ["new1@email-upsert.com", "new2@email-upsert.com"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");

      const createdContacts = await prisma.contact.findMany({
        where: {
          workspaceId: testWorkspace.id,
          email: { in: ["new1@email-upsert.com", "new2@email-upsert.com"] },
        },
      });

      expect(createdContacts.length).toBe(2);
    });

    test("should create and schedule broadcast to segment", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "segment-broadcast.example.com",
      );

      const segment = await createTestSegment(fullAccessApiKey, "Active Users");

      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "segment1@segment-test.com", status: "SUBSCRIBED" },
        { email: "segment2@segment-test.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contactSegment.createMany({
        data: [
          { contactId: contacts[0].id, segmentId: segment.id },
          { contactId: contacts[1].id, segmentId: segment.id },
        ],
      });

      const broadcastData = {
        name: "Segment Broadcast Test",
        from: `updates@${domain.name}`,
        emailContent: {
          subject: "Segment Update",
          html: "<p>Hello segment contacts!</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
        },
        recipients: {
          segment: segment.id,
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");
    });

    test("should create and schedule broadcast to topic", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "topic-broadcast.example.com",
      );

      const topic = await createTestTopic(fullAccessApiKey, "Announcements");

      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "topic1@topic-test.com", status: "SUBSCRIBED" },
        { email: "topic2@topic-test.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contactTopic.createMany({
        data: [
          { contactId: contacts[0].id, topicId: topic.id, status: "SUBSCRIBED" },
          { contactId: contacts[1].id, topicId: topic.id, status: "SUBSCRIBED" },
        ],
      });

      const broadcastData = {
        name: "Topic Broadcast Test",
        from: `announce@${domain.name}`,
        emailContent: {
          subject: "New Announcement",
          html: "<p>Check out our latest news!</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
        },
        recipients: {
          topic: topic.id,
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");
    });
  });

  describe("Scheduling", () => {
    test("should create broadcast with future sendAt", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "scheduled.example.com",
      );

      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "scheduled1@test.com", status: "SUBSCRIBED" },
      ]);

      const futureDate = getFutureDate(48); // 48 hours to avoid race conditions
      const broadcastData = {
        name: "Scheduled Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Scheduled Email",
          html: "<p>This is a scheduled email</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
        },
        recipients: {
          contacts: contacts.map((c) => c.id),
        },
        sendAt: futureDate,
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      if (response.status !== 201) {
        console.error("Error response:", JSON.stringify(responseData, null, 2));
      }

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");
      expect(responseData.id).toBeDefined();
    });

    test("should reject broadcast with past sendAt", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "past-date.example.com",
      );

      const broadcastData = {
        name: "Past Date Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Past Email",
          html: "<p>This should fail</p>",
        },
        recipients: {
          emails: ["past@test.com"],
        },
        sendAt: getPastDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe(ErrorCode.INVALID_PARAMETER);
      expect(responseData.error.message).toContain("future");
    });

    test("should reject broadcast without sendAt", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "no-sendat.example.com",
      );

      const broadcastData = {
        name: "No SendAt Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test Email",
          html: "<p>This should fail</p>",
        },
        recipients: {
          emails: ["no-sendat@test.com"],
        },
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });
  });

  describe("Reply-to handling", () => {
    test("should create broadcast with replyTo", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "replyto.example.com",
      );

      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "replyto-test@test.com", status: "SUBSCRIBED" },
      ]);

      const broadcastData = {
        name: "Reply-To Test",
        from: `news@${domain.name}`,
        replyTo: "support@replyto.example.com",
        emailContent: {
          subject: "Reply To Test",
          html: "<p>Test email with reply-to</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
        },
        recipients: {
          contacts: contacts.map((c) => c.id),
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");
      expect(responseData.id).toBeDefined();
    });
  });

  describe("Validation", () => {
    test("should reject without recipients", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "no-recipients.example.com",
      );

      const broadcastData = {
        name: "No Recipients Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {},
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    test("should reject with invalid email format", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "invalid-email.example.com",
      );

      const broadcastData = {
        name: "Invalid Email Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          emails: ["not-an-email"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    test("should reject without subject", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "no-subject.example.com",
      );

      const broadcastData = {
        name: "No Subject Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          html: "<p>No subject here</p>",
        },
        recipients: {
          emails: ["test@no-subject.com"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    test("should reject without html content", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "no-html.example.com",
      );

      const broadcastData = {
        name: "No HTML Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test",
        },
        recipients: {
          emails: ["test@no-html.com"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    test("should reject with non-existent segment", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "bad-segment.example.com",
      );

      const broadcastData = {
        name: "Bad Segment Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          segment: "non-existent-segment-id",
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.message).toContain("No valid recipients");
    });

    test("should reject with non-existent topic", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "bad-topic.example.com",
      );

      const broadcastData = {
        name: "Bad Topic Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          topic: "non-existent-topic-id",
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.message).toContain("No valid recipients");
    });

    test("should reject with empty contacts array", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "empty-contacts.example.com",
      );

      const broadcastData = {
        name: "Empty Contacts Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          contacts: [],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.message).toContain("No valid recipients");
    });
  });

  describe("Authentication and authorization", () => {
    test("should reject without write:broadcasts scope", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "scope-test.example.com",
      );

      const readOnlyApiKey = await createTestApiKey({
        workspaceId: testWorkspace.id,
        scopes: ["read:broadcasts"],
      });

      const broadcastData = {
        name: "Unauthorized Broadcast",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          emails: ["test@scope.com"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, readOnlyApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    });

    test("should reject request without API key", async () => {
      const broadcastData = {
        name: "No Auth Broadcast",
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          emails: ["test@noauth.com"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, "");
      const response = await CreateAndSendBroadcast(request);

      expect(response.status).toBe(401);
    });
  });

  describe("Optional fields", () => {
    test("should create broadcast with optional text content", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "text-content.example.com",
      );

      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "text-content@test.com", status: "SUBSCRIBED" },
      ]);

      const broadcastData = {
        name: "With Text Content",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Text Content Test",
          html: "<p>HTML version</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
          text: "Plain text version",
        },
        recipients: {
          contacts: contacts.map((c) => c.id),
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");
      expect(responseData.id).toBeDefined();
    });

    test("should create broadcast with optional previewText", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "preview-text.example.com",
      );

      const contacts = await createTestContacts(testWorkspace.id, [
        { email: "preview-text@test.com", status: "SUBSCRIBED" },
      ]);

      const broadcastData = {
        name: "With Preview Text",
        from: `news@${domain.name}`,
        emailContent: {
          subject: "Preview Text Test",
          html: "<p>Main content</p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a>",
          previewText: "This shows in the inbox preview",
        },
        recipients: {
          contacts: contacts.map((c) => c.id),
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.object).toBe("broadcast");
      expect(responseData.id).toBeDefined();
    });
  });

  describe("Name validation", () => {
    test("should reject broadcast without name", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "no-name.example.com",
      );

      const broadcastData = {
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          emails: ["test@no-name.com"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    test("should reject broadcast with empty name", async () => {
      const domain = await createVerifiedDomain(
        fullAccessApiKey,
        "empty-name.example.com",
      );

      const broadcastData = {
        name: "",
        emailContent: {
          subject: "Test",
          html: "<p>Test</p>",
        },
        recipients: {
          emails: ["test@empty-name.com"],
        },
        sendAt: getFutureDate(1),
      };

      const request = post("/broadcasts/create-and-send", broadcastData, fullAccessApiKey.key);
      const response = await CreateAndSendBroadcast(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });
  });
});
