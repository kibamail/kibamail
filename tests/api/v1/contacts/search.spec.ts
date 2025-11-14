/**
 * Integration tests for Contact Search (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/contacts/search - Search contacts with filters
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { POST as SEARCH } from "@/app/api/v1/contacts/search/route";
import { POST as CREATE_CONTACT } from "@/app/api/v1/contacts/route";
import { POST as CREATE_TAG } from "@/app/api/v1/tags/route";
import { POST as CREATE_TOPIC } from "@/app/api/v1/topics/route";
import { prisma } from "@/lib/db";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  cleanupWorkspace,
  post,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let vipTagId: string;
let spamTagId: string;
let newsletterTopicId: string;
let marketingTopicId: string;

/**
 * Setup: Create a test workspace and generate 100 contacts with various attributes
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);

  // Create tags
  const vipTagResponse = await CREATE_TAG(
    post("/tags", { name: "VIP", color: "#FFD700" }, fullAccessApiKey.key)
  );
  vipTagId = (await vipTagResponse.json()).id;

  const spamTagResponse = await CREATE_TAG(
    post("/tags", { name: "Spam", color: "#FF0000" }, fullAccessApiKey.key)
  );
  spamTagId = (await spamTagResponse.json()).id;

  // Create topics
  const newsletterTopicResponse = await CREATE_TOPIC(
    post(
      "/topics",
      { name: "Newsletter", slug: "newsletter-test" },
      fullAccessApiKey.key
    )
  );
  newsletterTopicId = (await newsletterTopicResponse.json()).id;

  const marketingTopicResponse = await CREATE_TOPIC(
    post(
      "/topics",
      { name: "Marketing", slug: "marketing-test" },
      fullAccessApiKey.key
    )
  );
  marketingTopicId = (await marketingTopicResponse.json()).id;

  // Generate 100 contacts
  const contactIds: string[] = [];
  for (let i = 0; i < 100; i++) {
    const email = `test${i}@example.com`;
    const status =
      i < 70
        ? "SUBSCRIBED"
        : i < 85
        ? "UNSUBSCRIBED"
        : i < 95
        ? "BOUNCED"
        : "COMPLAINED";
    const country = i < 50 ? "US" : i < 75 ? "CA" : i < 90 ? "UK" : "FR";

    const contactResponse = await CREATE_CONTACT(
      post(
        "/contacts",
        { email, status, country, firstName: `User${i}` },
        fullAccessApiKey.key
      )
    );
    const contactId = (await contactResponse.json()).id;
    contactIds.push(contactId);
  }

  // Assign VIP tag to first 30 contacts
  for (let i = 0; i < 30; i++) {
    await prisma.contactTag.create({
      data: {
        contactId: contactIds[i],
        tagId: vipTagId,
      },
    });
  }

  // Assign Spam tag to contacts 80-90
  for (let i = 80; i < 90; i++) {
    await prisma.contactTag.create({
      data: {
        contactId: contactIds[i],
        tagId: spamTagId,
      },
    });
  }

  // Subscribe first 40 contacts to newsletter topic
  for (let i = 0; i < 40; i++) {
    await prisma.contactTopic.create({
      data: {
        contactId: contactIds[i],
        topicId: newsletterTopicId,
        status: "SUBSCRIBED",
      },
    });
  }

  // Subscribe contacts 20-60 to marketing topic
  for (let i = 20; i < 60; i++) {
    await prisma.contactTopic.create({
      data: {
        contactId: contactIds[i],
        topicId: marketingTopicId,
        status: "SUBSCRIBED",
      },
    });
  }
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/contacts/search", () => {
  test("should search contacts by status", async () => {
    const request = post(
      "/contacts/search",
      {
        filters: {
          field: "status",
          operator: "eq",
          value: "SUBSCRIBED",
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_list");
    expect(responseData.data).toBeArray();
    expect(responseData.data.length).toBe(20); // Default limit
    expect(responseData.hasMore).toBe(true); // 70 total SUBSCRIBED contacts
  });

  test("should search contacts by country", async () => {
    const request = post(
      "/contacts/search",
      {
        filters: {
          field: "country",
          operator: "eq",
          value: "US",
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toBeArray();
    // All returned contacts should be from US
    for (const contact of responseData.data) {
      expect(contact.country).toBe("US");
    }
  });

  test("should search contacts by country using in operator", async () => {
    const request = post(
      "/contacts/search?limit=100",
      {
        filters: {
          field: "country",
          operator: "in",
          value: ["US", "CA"],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(75); // 50 US + 25 CA
    for (const contact of responseData.data) {
      expect(["US", "CA"]).toContain(contact.country);
    }
  });

  test("should search contacts with hasTag condition", async () => {
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          hasTag: [vipTagId],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(30); // 30 VIP contacts
  });

  test("should search contacts with doesNotHaveTag condition", async () => {
    const request = post(
      "/contacts/search?limit=100",
      {
        filters: {
          doesNotHaveTag: [spamTagId],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(90); // 100 - 10 spam contacts
  });

  test("should search contacts with subscribedToTopic condition", async () => {
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          subscribedToTopic: [newsletterTopicId],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(40); // 40 subscribed to newsletter
  });

  test("should search contacts with notSubscribedToTopic condition", async () => {
    const request = post(
      "/contacts/search?limit=100",
      {
        filters: {
          notSubscribedToTopic: [newsletterTopicId],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(60); // 100 - 40 subscribed
  });

  test("should search with $and combining multiple conditions", async () => {
    const request = post(
      "/contacts/search?limit=100",
      {
        filters: {
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
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should return SUBSCRIBED contacts from US only
    for (const contact of responseData.data) {
      expect(contact.status).toBe("SUBSCRIBED");
      expect(contact.country).toBe("US");
    }
  });

  test("should search with $or operator", async () => {
    const request = post(
      "/contacts/search?limit=100",
      {
        filters: {
          $or: [
            {
              field: "status",
              operator: "eq",
              value: "BOUNCED",
            },
            {
              field: "status",
              operator: "eq",
              value: "COMPLAINED",
            },
          ],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(15); // 10 BOUNCED + 5 COMPLAINED
    for (const contact of responseData.data) {
      expect(["BOUNCED", "COMPLAINED"]).toContain(contact.status);
    }
  });

  test("should search with complex nested conditions", async () => {
    const request = post(
      "/contacts/search?limit=100",
      {
        filters: {
          $and: [
            {
              field: "status",
              operator: "eq",
              value: "SUBSCRIBED",
            },
            {
              $or: [
                {
                  field: "country",
                  operator: "eq",
                  value: "US",
                },
                {
                  field: "country",
                  operator: "eq",
                  value: "CA",
                },
              ],
            },
            {
              hasTag: [vipTagId],
            },
          ],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should return SUBSCRIBED VIP contacts from US or CA
    for (const contact of responseData.data) {
      expect(contact.status).toBe("SUBSCRIBED");
      expect(["US", "CA"]).toContain(contact.country);
    }
  });

  test("should search with tag and topic conditions combined", async () => {
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          $and: [
            {
              hasTag: [vipTagId],
            },
            {
              subscribedToTopic: [newsletterTopicId],
            },
          ],
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // VIP contacts (0-29) AND newsletter subscribers (0-39) = 0-29 (30 contacts)
    expect(responseData.data.length).toBeGreaterThanOrEqual(1);
  });

  test("should support cursor pagination", async () => {
    // First page
    const firstRequest = post(
      "/contacts/search?limit=10",
      {
        filters: {
          field: "status",
          operator: "eq",
          value: "SUBSCRIBED",
        },
      },
      fullAccessApiKey.key
    );

    const firstResponse = await SEARCH(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstData.data).toHaveLength(10);
    expect(firstData.hasMore).toBe(true);

    // Second page
    const lastIdFromFirstPage = firstData.data[firstData.data.length - 1].id;
    const secondRequest = post(
      `/contacts/search?limit=10&after=${lastIdFromFirstPage}`,
      {
        filters: {
          field: "status",
          operator: "eq",
          value: "SUBSCRIBED",
        },
      },
      fullAccessApiKey.key
    );

    const secondResponse = await SEARCH(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondData.data).toHaveLength(10);
    expect(secondData.hasMore).toBe(true);
    // Verify no overlap
    const secondIds = secondData.data.map((c: any) => c.id);
    expect(secondIds).not.toContain(lastIdFromFirstPage);
  });

  test("should search with email contains operator", async () => {
    const request = post(
      "/contacts/search?limit=20",
      {
        filters: {
          field: "email",
          operator: "contains",
          value: "test1",
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should find test1@, test10-19@
    for (const contact of responseData.data) {
      expect(contact.email).toContain("test1");
    }
  });

  test("should reject search without filters", async () => {
    const request = post(
      "/contacts/search",
      {},
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject search with invalid condition structure", async () => {
    const request = post(
      "/contacts/search",
      {
        filters: {
          invalid: "structure",
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should enforce maximum limit of 100", async () => {
    const request = post(
      "/contacts/search?limit=200",
      {
        filters: {
          field: "status",
          operator: "eq",
          value: "SUBSCRIBED",
        },
      },
      fullAccessApiKey.key
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(responseData.data.length).toBeLessThanOrEqual(100);
  });
});
