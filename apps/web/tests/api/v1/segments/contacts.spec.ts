/**
 * Integration tests for Segment Contacts Endpoint (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/segments/[segmentId]/contacts - Get all contacts in a segment
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as CREATE_PROPERTY } from "@/app/(main)/api/v1/contact-properties/route";
import { GET } from "@/app/(main)/api/v1/segments/[segmentId]/contacts/route";
import { POST as CREATE_SEGMENT } from "@/app/(main)/api/v1/segments/route";
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

describe("GET /api/v1/segments/[segmentId]/contacts", () => {
  test("should return contacts matching segment conditions", async () => {
    const timestamp = Date.now();

    // Create contacts with different statuses
    for (let i = 0; i < 5; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `subscribed${i}_${timestamp}@example.com`,
          firstName: `Sub${i}`,
          status: "SUBSCRIBED",
        },
      });
    }

    for (let i = 0; i < 3; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `unsubscribed${i}_${timestamp}@example.com`,
          firstName: `Unsub${i}`,
          status: "UNSUBSCRIBED",
        },
      });
    }

    // Create segment for SUBSCRIBED contacts
    const segmentResponse = await CREATE_SEGMENT(
      post(
        "/segments",
        {
          name: `Subscribed Users ${timestamp}`,
          conditions: {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
        },
        fullAccessApiKey.key,
      ),
    );
    const segment = await segmentResponse.json();

    // Get contacts in segment
    const request = get(
      `/segments/${segment.id}/contacts`,
      fullAccessApiKey.key,
    );
    const response = await GET(request, {
      params: Promise.resolve({ segmentId: segment.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(5);
    for (const contact of responseData.data) {
      expect(contact.status).toBe("SUBSCRIBED");
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
    }
  });

  test("should return contacts with custom property values", async () => {
    const timestamp = Date.now();

    // Create custom property
    const ageProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Age_${timestamp}`, type: "NUMBER" },
        fullAccessApiKey.key,
      ),
    );
    const ageData = await ageProperty.json();
    const ageRecord = await prisma.contactProperty.findUnique({
      where: { id: ageData.id },
    });
    const agePropertySlot = ageRecord!.slot;

    // Create contacts with different ages
    for (let i = 0; i < 3; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `young${i}_${timestamp}@example.com`,
          firstName: `Young${i}`,
          status: "SUBSCRIBED",
          [agePropertySlot]: 25,
        },
      });
    }

    for (let i = 0; i < 2; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `old${i}_${timestamp}@example.com`,
          firstName: `Old${i}`,
          status: "SUBSCRIBED",
          [agePropertySlot]: 45,
        },
      });
    }

    // Create segment for age >= 30
    const segmentResponse = await CREATE_SEGMENT(
      post(
        "/segments",
        {
          name: `Age 30+ ${timestamp}`,
          conditions: {
            field: `Age_${timestamp}`,
            operator: "gte",
            value: 30,
          },
        },
        fullAccessApiKey.key,
      ),
    );
    const segment = await segmentResponse.json();

    // Get contacts in segment
    const request = get(
      `/segments/${segment.id}/contacts`,
      fullAccessApiKey.key,
    );
    const response = await GET(request, {
      params: Promise.resolve({ segmentId: segment.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(2);
    for (const contact of responseData.data) {
      expect(contact.properties[`Age_${timestamp}`]).toBe(45);
    }
  });

  test("should support cursor pagination", async () => {
    const timestamp = Date.now();

    // Create many contacts
    for (let i = 0; i < 25; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `contact${i}_${timestamp}@example.com`,
          firstName: `User${i}`,
          status: "SUBSCRIBED",
        },
      });
    }

    // Create segment for all SUBSCRIBED
    const segmentResponse = await CREATE_SEGMENT(
      post(
        "/segments",
        {
          name: `All Subscribed ${timestamp}`,
          conditions: {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
        },
        fullAccessApiKey.key,
      ),
    );
    const segment = await segmentResponse.json();

    // Get first page
    const firstRequest = get(
      `/segments/${segment.id}/contacts?limit=10`,
      fullAccessApiKey.key,
    );
    const firstResponse = await GET(firstRequest, {
      params: Promise.resolve({ segmentId: segment.id }),
    });
    const firstData = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstData.data.length).toBe(10);
    expect(firstData.hasMore).toBe(true);

    // Get second page
    const lastIdFromFirstPage = firstData.data[firstData.data.length - 1].id;
    const secondRequest = get(
      `/segments/${segment.id}/contacts?limit=10&after=${lastIdFromFirstPage}`,
      fullAccessApiKey.key,
    );
    const secondResponse = await GET(secondRequest, {
      params: Promise.resolve({ segmentId: segment.id }),
    });
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondData.data.length).toBe(10);
    expect(secondData.hasMore).toBe(true);

    // Verify no overlap
    const secondIds = secondData.data.map((c: any) => c.id);
    expect(secondIds).not.toContain(lastIdFromFirstPage);
  });

  test("should return empty list for segment with no matching contacts", async () => {
    const timestamp = Date.now();

    // Create only SUBSCRIBED contacts
    for (let i = 0; i < 3; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `user${i}_${timestamp}@example.com`,
          firstName: `User${i}`,
          status: "SUBSCRIBED",
        },
      });
    }

    // Create segment for BOUNCED (none exist)
    const segmentResponse = await CREATE_SEGMENT(
      post(
        "/segments",
        {
          name: `Bounced Users ${timestamp}`,
          conditions: {
            field: "status",
            operator: "eq",
            value: "BOUNCED",
          },
        },
        fullAccessApiKey.key,
      ),
    );
    const segment = await segmentResponse.json();

    // Get contacts in segment
    const request = get(
      `/segments/${segment.id}/contacts`,
      fullAccessApiKey.key,
    );
    const response = await GET(request, {
      params: Promise.resolve({ segmentId: segment.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(0);
    expect(responseData.hasMore).toBe(false);
  });

  test("should return 404 for non-existent segment", async () => {
    const request = get(
      "/segments/nonexistent-segment-id/contacts",
      fullAccessApiKey.key,
    );
    const response = await GET(request, {
      params: Promise.resolve({ segmentId: "nonexistent-segment-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBe("Segment not found");
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should not return contacts from different workspace", async () => {
    const timestamp = Date.now();

    // Create workspace 1 with contacts and segment
    const workspace1 = createTestWorkspace();
    const apiKey1 = await createFullAccessApiKey(workspace1.id);

    for (let i = 0; i < 3; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: workspace1.id,
          email: `w1contact${i}_${timestamp}@example.com`,
          firstName: `W1User${i}`,
          status: "SUBSCRIBED",
        },
      });
    }

    const segment1Response = await CREATE_SEGMENT(
      post(
        "/segments",
        {
          name: `W1 Segment ${timestamp}`,
          conditions: {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
        },
        apiKey1.key,
      ),
    );
    const segment1 = await segment1Response.json();

    // Create workspace 2 with API key
    const workspace2 = createTestWorkspace();
    const apiKey2 = await createFullAccessApiKey(workspace2.id);

    // Try to access workspace 1 segment with workspace 2 API key
    const request = get(`/segments/${segment1.id}/contacts`, apiKey2.key);
    const response = await GET(request, {
      params: Promise.resolve({ segmentId: segment1.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBe("Segment not found");
    expect(responseData.error.requestId).toBeDefined();

    await cleanupWorkspace(workspace1.id);
    await cleanupWorkspace(workspace2.id);
  });

  test("should reject request without read:contacts scope", async () => {
    const timestamp = Date.now();

    // Create segment
    const segmentResponse = await CREATE_SEGMENT(
      post(
        "/segments",
        {
          name: `Test Segment ${timestamp}`,
          conditions: {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
        },
        fullAccessApiKey.key,
      ),
    );
    const segment = await segmentResponse.json();

    // Create API key without read:contacts scope
    const limitedKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:segments"],
    });

    const request = get(`/segments/${segment.id}/contacts`, limitedKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ segmentId: segment.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should handle complex conditions with $and operator", async () => {
    const timestamp = Date.now();

    // Create contacts in US
    for (let i = 0; i < 4; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `us_subscribed${i}_${timestamp}@example.com`,
          firstName: `USUser${i}`,
          status: "SUBSCRIBED",
          country: "US",
        },
      });
    }

    // Create contacts in CA
    for (let i = 0; i < 2; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `ca_subscribed${i}_${timestamp}@example.com`,
          firstName: `CAUser${i}`,
          status: "SUBSCRIBED",
          country: "CA",
        },
      });
    }

    // Create unsubscribed in US
    await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: `us_unsubscribed_${timestamp}@example.com`,
        firstName: "USUnsub",
        status: "UNSUBSCRIBED",
        country: "US",
      },
    });

    // Create segment for SUBSCRIBED AND US
    const segmentResponse = await CREATE_SEGMENT(
      post(
        "/segments",
        {
          name: `US Subscribed ${timestamp}`,
          conditions: {
            $and: [
              {
                field: "status",
                operator: "eq",
                value: "SUBSCRIBED",
              },
              {
                field: "country",
                operator: "eq",
                value: "US",
              },
            ],
          },
        },
        fullAccessApiKey.key,
      ),
    );
    const segment = await segmentResponse.json();

    // Get contacts in segment
    const request = get(
      `/segments/${segment.id}/contacts`,
      fullAccessApiKey.key,
    );
    const response = await GET(request, {
      params: Promise.resolve({ segmentId: segment.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(4);
    for (const contact of responseData.data) {
      expect(contact.status).toBe("SUBSCRIBED");
      expect(contact.country).toBe("US");
    }
  });
});
