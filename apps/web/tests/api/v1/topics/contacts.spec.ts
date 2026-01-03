/**
 * Integration tests for Topic Contacts Endpoint (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/topics/[topicId]/contacts - Get all contacts subscribed to a topic
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as CREATE_PROPERTY } from "@/app/(main)/api/v1/contact-properties/route";
import { GET } from "@/app/(main)/api/v1/topics/[topicId]/contacts/route";
import { POST as CREATE_TOPIC } from "@/app/(main)/api/v1/topics/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
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

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/topics/[topicId]/contacts", () => {
  test("should return contacts subscribed to topic", async () => {
    const timestamp = Date.now();

    // Create topic
    const topicResponse = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `Newsletter ${timestamp}`,
        },
        fullAccessApiKey.key,
      ),
    );
    const topicData = await topicResponse.json();
    const topicId = topicData.id;

    // Create contacts and subscribe them to topic
    for (let i = 0; i < 5; i++) {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `subscribed${i}_${timestamp}@example.com`,
          firstName: `Sub${i}`,
          status: "SUBSCRIBED",
        },
      });

      await prisma.contactTopic.create({
        data: {
          contactId: contact.id,
          topicId: topicId,
          status: "SUBSCRIBED",
        },
      });
    }

    // Create unsubscribed contacts
    for (let i = 0; i < 3; i++) {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `unsubscribed${i}_${timestamp}@example.com`,
          firstName: `Unsub${i}`,
          status: "SUBSCRIBED",
        },
      });

      await prisma.contactTopic.create({
        data: {
          contactId: contact.id,
          topicId: topicId,
          status: "UNSUBSCRIBED",
        },
      });
    }

    // Get contacts in topic
    const request = get(`/topics/${topicId}/contacts`, fullAccessApiKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ topicId: topicId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(5);
    for (const contact of responseData.data) {
      expect(contact.email).toContain("subscribed");
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
    }
  });

  test("should return contacts with custom property values", async () => {
    const timestamp = Date.now();

    // Create topic
    const topicResponse = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `Premium ${timestamp}`,
        },
        fullAccessApiKey.key,
      ),
    );
    const topicData = await topicResponse.json();
    const topicId = topicData.id;

    // Create custom property
    const tierProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Tier_${timestamp}`, type: "STRING" },
        fullAccessApiKey.key,
      ),
    );
    const tierData = await tierProperty.json();
    const tierRecord = await prisma.contactProperty.findUnique({
      where: { id: tierData.id },
    });
    const tierPropertySlot = tierRecord?.slot;

    // Create contacts with tier property
    for (let i = 0; i < 3; i++) {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `premium${i}_${timestamp}@example.com`,
          firstName: `Premium${i}`,
          status: "SUBSCRIBED",
          [tierPropertySlot]: "premium",
        },
      });

      await prisma.contactTopic.create({
        data: {
          contactId: contact.id,
          topicId: topicId,
          status: "SUBSCRIBED",
        },
      });
    }

    // Get contacts in topic
    const request = get(`/topics/${topicId}/contacts`, fullAccessApiKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ topicId: topicId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(3);
    for (const contact of responseData.data) {
      expect(contact.properties[`Tier_${timestamp}`]).toBe("premium");
    }
  });

  test("should support cursor pagination", async () => {
    const timestamp = Date.now();

    // Create topic
    const topicResponse = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `Large List ${timestamp}`,
        },
        fullAccessApiKey.key,
      ),
    );
    const topicData = await topicResponse.json();
    const topicId = topicData.id;

    // Create many contacts
    for (let i = 0; i < 25; i++) {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `contact${i}_${timestamp}@example.com`,
          firstName: `User${i}`,
          status: "SUBSCRIBED",
        },
      });

      await prisma.contactTopic.create({
        data: {
          contactId: contact.id,
          topicId: topicId,
          status: "SUBSCRIBED",
        },
      });
    }

    // Get first page
    const firstRequest = get(
      `/topics/${topicId}/contacts?limit=10`,
      fullAccessApiKey.key,
    );
    const firstResponse = await GET(firstRequest, {
      params: Promise.resolve({ topicId: topicId }),
    });
    const firstData = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstData.data.length).toBe(10);
    expect(firstData.hasMore).toBe(true);

    // Get second page
    const lastIdFromFirstPage = firstData.data[firstData.data.length - 1].id;
    const secondRequest = get(
      `/topics/${topicId}/contacts?limit=10&after=${lastIdFromFirstPage}`,
      fullAccessApiKey.key,
    );
    const secondResponse = await GET(secondRequest, {
      params: Promise.resolve({ topicId: topicId }),
    });
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondData.data.length).toBe(10);
    expect(secondData.hasMore).toBe(true);

    // Verify no overlap
    const secondIds = secondData.data.map((c: any) => c.id);
    expect(secondIds).not.toContain(lastIdFromFirstPage);
  });

  test("should return empty list for topic with no subscribers", async () => {
    const timestamp = Date.now();

    // Create topic with no subscribers
    const topicResponse = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `Empty Topic ${timestamp}`,
        },
        fullAccessApiKey.key,
      ),
    );
    const topicData = await topicResponse.json();
    const topicId = topicData.id;

    // Get contacts in topic
    const request = get(`/topics/${topicId}/contacts`, fullAccessApiKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ topicId: topicId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(0);
    expect(responseData.hasMore).toBe(false);
  });

  test("should return 404 for non-existent topic", async () => {
    const request = get(
      "/topics/nonexistent-topic-id/contacts",
      fullAccessApiKey.key,
    );
    const response = await GET(request, {
      params: Promise.resolve({ topicId: "nonexistent-topic-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toBe("Topic not found");
  });

  test("should not return contacts from different workspace", async () => {
    const timestamp = Date.now();

    // Create workspace 1 with topic and contacts
    const workspace1 = createTestWorkspace();
    const apiKey1 = await createFullAccessApiKey(workspace1.id);

    const topic1Response = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `W1 Topic ${timestamp}`,
        },
        apiKey1.key,
      ),
    );
    const topic1Data = await topic1Response.json();
    const topic1Id = topic1Data.id;

    for (let i = 0; i < 3; i++) {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: workspace1.id,
          email: `w1contact${i}_${timestamp}@example.com`,
          firstName: `W1User${i}`,
          status: "SUBSCRIBED",
        },
      });

      await prisma.contactTopic.create({
        data: {
          contactId: contact.id,
          topicId: topic1Id,
          status: "SUBSCRIBED",
        },
      });
    }

    // Create workspace 2 with API key
    const workspace2 = createTestWorkspace();
    const apiKey2 = await createFullAccessApiKey(workspace2.id);

    // Try to access workspace 1 topic with workspace 2 API key
    const request = get(`/topics/${topic1Id}/contacts`, apiKey2.key);
    const response = await GET(request, {
      params: Promise.resolve({ topicId: topic1Id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toBe("Topic not found");

    await cleanupWorkspace(workspace1.id);
    await cleanupWorkspace(workspace2.id);
  });

  test("should reject request without read:contacts scope", async () => {
    const timestamp = Date.now();

    // Create topic
    const topicResponse = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `Test Topic ${timestamp}`,
        },
        fullAccessApiKey.key,
      ),
    );
    const topicData = await topicResponse.json();
    const topicId = topicData.id;

    // Create API key without read:contacts scope
    const limitedKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:topics"],
    });

    const request = get(`/topics/${topicId}/contacts`, limitedKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ topicId: topicId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should handle contact subscribed to multiple topics", async () => {
    const timestamp = Date.now();

    // Create two topics
    const topic1Response = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `Topic 1 ${timestamp}`,
        },
        fullAccessApiKey.key,
      ),
    );
    const topic1Data = await topic1Response.json();
    const topic1Id = topic1Data.id;

    const topic2Response = await CREATE_TOPIC(
      post(
        "/topics",
        {
          name: `Topic 2 ${timestamp}`,
        },
        fullAccessApiKey.key,
      ),
    );
    const topic2Data = await topic2Response.json();
    const topic2Id = topic2Data.id;

    // Create contact subscribed to both topics
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: `multitopic_${timestamp}@example.com`,
        firstName: "MultiTopic",
        status: "SUBSCRIBED",
      },
    });

    await prisma.contactTopic.createMany({
      data: [
        {
          contactId: contact.id,
          topicId: topic1Id,
          status: "SUBSCRIBED",
        },
        {
          contactId: contact.id,
          topicId: topic2Id,
          status: "SUBSCRIBED",
        },
      ],
    });

    // Get contacts in topic 1
    const request1 = get(`/topics/${topic1Id}/contacts`, fullAccessApiKey.key);
    const response1 = await GET(request1, {
      params: Promise.resolve({ topicId: topic1Id }),
    });
    const responseData1 = await response1.json();

    expect(response1.status).toBe(200);
    expect(responseData1.data.length).toBe(1);
    expect(responseData1.data[0].email).toBe(
      `multitopic_${timestamp}@example.com`,
    );

    // Get contacts in topic 2
    const request2 = get(`/topics/${topic2Id}/contacts`, fullAccessApiKey.key);
    const response2 = await GET(request2, {
      params: Promise.resolve({ topicId: topic2Id }),
    });
    const responseData2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(responseData2.data.length).toBe(1);
    expect(responseData2.data[0].email).toBe(
      `multitopic_${timestamp}@example.com`,
    );
  });
});
