/**
 * Integration tests for Contact Search (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/contacts/search - Search contacts with filters
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as CREATE_PROPERTY } from "@/app/(main)/api/v1/contact-properties/route";
import { POST as CREATE_CONTACT } from "@/app/(main)/api/v1/contacts/route";
import { POST as SEARCH } from "@/app/(main)/api/v1/contacts/search/route";
import { POST as CREATE_TOPIC } from "@/app/(main)/api/v1/topics/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let newsletterTopicId: string;
let marketingTopicId: string;

/**
 * Setup: Create a test workspace and generate 100 contacts with various attributes
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);

  // Create topics
  const newsletterTopicResponse = await CREATE_TOPIC(
    post("/topics", { name: "Newsletter" }, fullAccessApiKey.key),
  );
  newsletterTopicId = (await newsletterTopicResponse.json()).id;

  const marketingTopicResponse = await CREATE_TOPIC(
    post("/topics", { name: "Marketing" }, fullAccessApiKey.key),
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
        fullAccessApiKey.key,
      ),
    );
    const contactId = (await contactResponse.json()).id;
    contactIds.push(contactId);
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
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(20); // Default limit
    expect(responseData.hasMore).toBe(true); // 70 total SUBSCRIBED contacts

    responseData.data.forEach((contact: { properties: unknown }) => {
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
    });
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
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toBeDefined();
    // All returned contacts should be from US
    for (const contact of responseData.data) {
      expect(contact.country).toBe("US");
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
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
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(75); // 50 US + 25 CA
    for (const contact of responseData.data) {
      expect(["US", "CA"]).toContain(contact.country);
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
    }
  });

  test("should search contacts with subscribedToTopic condition", async () => {
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          subscribedToTopic: [newsletterTopicId],
        },
      },
      fullAccessApiKey.key,
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
      fullAccessApiKey.key,
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
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    for (const contact of responseData.data) {
      expect(contact.status).toBe("SUBSCRIBED");
      expect(contact.country).toBe("US");
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
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
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(15); // 10 BOUNCED + 5 COMPLAINED

    for (const contact of responseData.data) {
      expect(["BOUNCED", "COMPLAINED"]).toContain(contact.status);
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
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
          ],
        },
      },
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should return SUBSCRIBED contacts from US or CA
    for (const contact of responseData.data) {
      expect(contact.status).toBe("SUBSCRIBED");
      expect(["US", "CA"]).toContain(contact.country);
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
    }
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
      fullAccessApiKey.key,
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
      fullAccessApiKey.key,
    );

    const secondResponse = await SEARCH(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondData.data).toHaveLength(10);
    expect(secondData.hasMore).toBe(true);
    // Verify no overlap
    const secondIds = secondData.data.map((c: { id: string }) => c.id);
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
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should find test1@, test10-19@
    for (const contact of responseData.data) {
      expect(contact.email).toContain("test1");
      expect(contact.properties).toBeDefined();
      expect(contact.properties).toBeTypeOf("object");
    }
  });

  test("should reject search without filters", async () => {
    const request = post("/contacts/search", {}, fullAccessApiKey.key);

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject search with invalid condition structure", async () => {
    const request = post(
      "/contacts/search",
      {
        filters: {
          invalid: "structure",
        },
      },
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
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
      fullAccessApiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(responseData.data.length).toBeLessThanOrEqual(100);
  });
});

describe("POST /api/v1/contacts/search - Custom Property Filtering", () => {
  test("should search by NUMBER property with eq operator", async () => {
    const timestamp = Date.now();
    const workspace = createTestWorkspace();
    const apiKey = await createFullAccessApiKey(workspace.id);

    // Create custom property
    const ageProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Age_${timestamp}`, type: "NUMBER" },
        apiKey.key,
      ),
    );
    const ageData = await ageProperty.json();
    const ageRecord = await prisma.contactProperty.findUnique({
      where: { id: ageData.id },
    });
    const agePropertySlot = ageRecord?.slot;

    // Create test contacts with different ages
    for (let i = 0; i < 5; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: `contact${i}_${timestamp}@example.com`,
          firstName: `User${i}`,
          status: "SUBSCRIBED",
          [agePropertySlot]: 35,
        },
      });
    }

    // Create contacts with different age
    for (let i = 5; i < 8; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: `contact${i}_${timestamp}@example.com`,
          firstName: `User${i}`,
          status: "SUBSCRIBED",
          [agePropertySlot]: 25,
        },
      });
    }

    // Search for age = 35
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          field: `Age_${timestamp}`,
          operator: "eq",
          value: 35,
        },
      },
      apiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(5);
    for (const contact of responseData.data) {
      expect(contact.properties[`Age_${timestamp}`]).toBe(35);
    }

    await cleanupWorkspace(workspace.id);
  });

  test("should search by STRING property with eq operator", async () => {
    const timestamp = Date.now();
    const workspace = createTestWorkspace();
    const apiKey = await createFullAccessApiKey(workspace.id);

    // Create custom property
    const deptProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Department_${timestamp}`, type: "STRING" },
        apiKey.key,
      ),
    );
    const deptData = await deptProperty.json();
    const deptRecord = await prisma.contactProperty.findUnique({
      where: { id: deptData.id },
    });
    const deptPropertySlot = deptRecord?.slot;

    // Create test contacts
    for (let i = 0; i < 5; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: `eng${i}_${timestamp}@example.com`,
          firstName: `Eng${i}`,
          status: "SUBSCRIBED",
          [deptPropertySlot]: "Engineering",
        },
      });
    }

    for (let i = 0; i < 3; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: `mkt${i}_${timestamp}@example.com`,
          firstName: `Mkt${i}`,
          status: "SUBSCRIBED",
          [deptPropertySlot]: "Marketing",
        },
      });
    }

    // Search for Engineering
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          field: `Department_${timestamp}`,
          operator: "eq",
          value: "Engineering",
        },
      },
      apiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(5);
    for (const contact of responseData.data) {
      expect(contact.properties[`Department_${timestamp}`]).toBe("Engineering");
    }

    await cleanupWorkspace(workspace.id);
  });

  test("should combine multiple custom properties with $and operator", async () => {
    const timestamp = Date.now();
    const workspace = createTestWorkspace();
    const apiKey = await createFullAccessApiKey(workspace.id);

    // Create custom properties
    const ageProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Age_${timestamp}`, type: "NUMBER" },
        apiKey.key,
      ),
    );
    const ageData = await ageProperty.json();
    const ageRecord = await prisma.contactProperty.findUnique({
      where: { id: ageData.id },
    });
    const agePropertySlot = ageRecord?.slot;

    const deptProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Dept_${timestamp}`, type: "STRING" },
        apiKey.key,
      ),
    );
    const deptData = await deptProperty.json();
    const deptRecord = await prisma.contactProperty.findUnique({
      where: { id: deptData.id },
    });
    const deptPropertySlot = deptRecord?.slot;

    // Create matching contacts: age >= 30 AND department = Engineering
    for (let i = 0; i < 4; i++) {
      await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: `match${i}_${timestamp}@example.com`,
          firstName: `Match${i}`,
          status: "SUBSCRIBED",
          [agePropertySlot]: 35,
          [deptPropertySlot]: "Engineering",
        },
      });
    }

    // Create non-matching contacts
    await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        email: `nomatch1_${timestamp}@example.com`,
        firstName: "NoMatch1",
        status: "SUBSCRIBED",
        [agePropertySlot]: 25, // age too low
        [deptPropertySlot]: "Engineering",
      },
    });

    await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        email: `nomatch2_${timestamp}@example.com`,
        firstName: "NoMatch2",
        status: "SUBSCRIBED",
        [agePropertySlot]: 35,
        [deptPropertySlot]: "Marketing", // wrong dept
      },
    });

    // Search with $and
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          $and: [
            {
              field: `Age_${timestamp}`,
              operator: "gte",
              value: 30,
            },
            {
              field: `Dept_${timestamp}`,
              operator: "eq",
              value: "Engineering",
            },
          ],
        },
      },
      apiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(4);
    for (const contact of responseData.data) {
      expect(contact.properties[`Age_${timestamp}`]).toBeGreaterThanOrEqual(30);
      expect(contact.properties[`Dept_${timestamp}`]).toBe("Engineering");
    }

    await cleanupWorkspace(workspace.id);
  });

  test("should reject search with invalid property name", async () => {
    const timestamp = Date.now();
    const workspace = createTestWorkspace();
    const apiKey = await createFullAccessApiKey(workspace.id);

    const request = post(
      "/contacts/search",
      {
        filters: {
          field: `NonExistentProperty_${timestamp}`,
          operator: "eq",
          value: "test",
        },
      },
      apiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain(
      "Invalid field(s) in conditions",
    );
    expect(responseData.error.message).toContain(
      `NonExistentProperty_${timestamp}`,
    );

    await cleanupWorkspace(workspace.id);
  });

  test("should return property values in search results", async () => {
    const timestamp = Date.now();
    const workspace = createTestWorkspace();
    const apiKey = await createFullAccessApiKey(workspace.id);

    // Create custom properties
    const ageProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Age_${timestamp}`, type: "NUMBER" },
        apiKey.key,
      ),
    );
    const ageData = await ageProperty.json();
    const ageRecord = await prisma.contactProperty.findUnique({
      where: { id: ageData.id },
    });
    const agePropertySlot = ageRecord?.slot;

    // Create property that won't be set
    await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `EmptyProp_${timestamp}`, type: "STRING" },
        apiKey.key,
      ),
    );

    // Create contact with only age set
    await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        email: `withprops_${timestamp}@example.com`,
        firstName: "WithProps",
        status: "SUBSCRIBED",
        [agePropertySlot]: 42,
      },
    });

    // Search for this contact
    const request = post(
      "/contacts/search?limit=50",
      {
        filters: {
          field: "email",
          operator: "eq",
          value: `withprops_${timestamp}@example.com`,
        },
      },
      apiKey.key,
    );

    const response = await SEARCH(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(1);
    expect(responseData.data[0].properties).toBeDefined();
    expect(responseData.data[0].properties).toBeTypeOf("object");
    // Should include set property
    expect(responseData.data[0].properties[`Age_${timestamp}`]).toBe(42);
    // Should NOT include unset property
    expect(
      responseData.data[0].properties[`EmptyProp_${timestamp}`],
    ).toBeUndefined();

    await cleanupWorkspace(workspace.id);
  });
});
