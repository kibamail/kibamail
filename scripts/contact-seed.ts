#!/usr/bin/env bun

/**
 * Contact Seeding Script
 *
 * Seeds the database with 1000 contacts with realistic data including:
 * - Variable contact statuses
 * - Custom properties
 * - Topic subscriptions
 * - Varied dates for subscriptions/unsubscriptions
 *
 * Usage:
 *   bun run scripts/contact-seed.ts
 */

import { faker } from "@faker-js/faker";
import type { ContactStatus, TopicSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRedisClient } from "@/lib/storage/redis-client";
import { getSegmentContactsKey } from "@/lib/storage/redis-keys";

const CONTACT_COUNT = 1000;
const BATCH_SIZE = 100; // Insert contacts in batches for better performance

// Prompt for workspace ID
console.log("Contact Seeding Script");
console.log("=====================\n");

const workspaceIdInput = prompt("Enter workspace ID:");

if (!workspaceIdInput) {
  console.error("❌ Workspace ID is required");
  process.exit(1);
}

const workspaceId: string = workspaceIdInput;

console.log(`✓ Using workspace: ${workspaceId}\n`);

/**
 * Clean up existing data
 */
async function cleanupExistingData(workspaceId: string) {
  console.log("Cleaning up existing data...");

  // Hard delete all data for the workspace (bypassing soft deletes)
  await prisma.$executeRaw`DELETE FROM contact_segments WHERE segmentId IN (SELECT id FROM segments WHERE workspaceId = ${workspaceId})`;
  await prisma.$executeRaw`DELETE FROM contact_topics WHERE contactId IN (SELECT id FROM contacts WHERE workspaceId = ${workspaceId})`;
  await prisma.$executeRaw`DELETE FROM contacts WHERE workspaceId = ${workspaceId}`;
  console.log(`  ✓ Deleted all contacts and relationships`);

  await prisma.$executeRaw`DELETE FROM topics WHERE workspaceId = ${workspaceId}`;
  console.log(`  ✓ Deleted all topics`);

  await prisma.$executeRaw`DELETE FROM contact_properties WHERE workspaceId = ${workspaceId}`;
  console.log(`  ✓ Deleted all contact properties`);

  await prisma.$executeRaw`DELETE FROM segments WHERE workspaceId = ${workspaceId}`;
  console.log(`  ✓ Deleted all segments`);

  console.log();
}

/**
 * Create test topics
 */
async function createTestTopics(workspaceId: string) {
  console.log("Creating test topics...");

  const topics = [
    {
      name: "Newsletter",
      description: "Weekly newsletter updates",
      visibility: "PUBLIC" as const,
      defaultOptIn: true,
    },
    {
      name: "Product Updates",
      description: "New features and product announcements",
      visibility: "PUBLIC" as const,
      defaultOptIn: false,
    },
    {
      name: "Marketing",
      description: "Special offers and promotions",
      visibility: "PUBLIC" as const,
      defaultOptIn: false,
    },
    {
      name: "System Notifications",
      description: "Important system and account notifications",
      visibility: "PRIVATE" as const,
      defaultOptIn: true,
    },
  ];

  const createdTopics = [];

  for (const topic of topics) {
    const existing = await prisma.topic.findFirst({
      where: { workspaceId, name: topic.name },
    });

    if (existing) {
      console.log(`  • Topic "${topic.name}" already exists`);
      createdTopics.push(existing);
    } else {
      const created = await prisma.topic.create({
        data: { ...topic, workspaceId },
      });
      console.log(`  ✓ Created topic: ${topic.name}`);
      createdTopics.push(created);
    }
  }

  return createdTopics;
}

/**
 * Create test contact properties
 */
async function createTestContactProperties(workspaceId: string) {
  console.log("\nCreating test contact properties...");

  const properties = [
    {
      name: "Age",
      type: "NUMBER" as const,
      slot: "propertyFloat0",
      defaultValue: null,
    },
    {
      name: "Company",
      type: "STRING" as const,
      slot: "propertyString0",
      defaultValue: null,
    },
    {
      name: "Job Title",
      type: "STRING" as const,
      slot: "propertyString1",
      defaultValue: null,
    },
    {
      name: "Last Purchase Date",
      type: "DATE" as const,
      slot: "propertyFloat1",
      defaultValue: null,
    },
    {
      name: "Total Spent",
      type: "NUMBER" as const,
      slot: "propertyFloat2",
      defaultValue: null,
    },
    {
      name: "VIP Status",
      type: "STRING" as const,
      slot: "propertyString2",
      defaultValue: null,
    },
  ];

  const createdProperties = [];

  for (const property of properties) {
    // Check for existing property by slot or name
    const existing = await prisma.contactProperty.findFirst({
      where: {
        workspaceId,
        OR: [{ slot: property.slot }, { name: property.name }],
      },
    });

    if (existing) {
      console.log(
        `  • Property "${property.name}" already exists (or slot in use)`,
      );
      createdProperties.push(existing);
    } else {
      const created = await prisma.contactProperty.create({
        data: { ...property, workspaceId },
      });
      console.log(`  ✓ Created property: ${property.name}`);
      createdProperties.push(created);
    }
  }

  return createdProperties;
}

/**
 * Create test segments
 */
async function createTestSegments(workspaceId: string) {
  console.log("\nCreating test segments...");

  const segments = [
    {
      name: "Active Subscribers",
      description: "Contacts with SUBSCRIBED status",
      conditions: {
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      },
    },
    {
      name: "High Value Customers",
      description: "Customers who spent more than $1000",
      conditions: {
        field: "propertyFloat2",
        operator: "gte",
        value: 1000,
      },
    },
    {
      name: "VIP Customers",
      description: "Customers with VIP status",
      conditions: {
        field: "propertyString2",
        operator: "eq",
        value: "VIP",
      },
    },
    {
      name: "Active VIP Customers",
      description: "Active subscribers with VIP status",
      conditions: {
        $and: [
          {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
          {
            field: "propertyString2",
            operator: "eq",
            value: "VIP",
          },
        ],
      },
    },
    {
      name: "Recent High Spenders",
      description: "Customers who spent over $2000 in the last 6 months",
      conditions: {
        $and: [
          {
            field: "propertyFloat2",
            operator: "gte",
            value: 2000,
          },
          {
            field: "propertyFloat1",
            operator: "gte",
            value: Date.now() - 6 * 30 * 24 * 60 * 60 * 1000,
          },
        ],
      },
    },
    {
      name: "Young Professionals",
      description: "Subscribers aged 25-40 with job titles",
      conditions: {
        $and: [
          {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
          {
            field: "propertyFloat0",
            operator: "gte",
            value: 25,
          },
          {
            field: "propertyFloat0",
            operator: "lte",
            value: 40,
          },
          {
            field: "propertyString1",
            operator: "exists",
            value: true,
          },
        ],
      },
    },
    {
      name: "At Risk Customers",
      description:
        "Inactive customers who haven't purchased in 6 months or bounced/complained",
      conditions: {
        $or: [
          {
            $and: [
              {
                field: "status",
                operator: "eq",
                value: "SUBSCRIBED",
              },
              {
                field: "propertyFloat1",
                operator: "lte",
                value: Date.now() - 6 * 30 * 24 * 60 * 60 * 1000,
              },
            ],
          },
          {
            field: "status",
            operator: "in",
            value: ["BOUNCED", "COMPLAINED"],
          },
        ],
      },
    },
    {
      name: "Premium Engaged Users",
      description: "VIP or high spenders with recent activity",
      conditions: {
        $and: [
          {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
          {
            $or: [
              {
                field: "propertyString2",
                operator: "eq",
                value: "VIP",
              },
              {
                field: "propertyFloat2",
                operator: "gte",
                value: 1500,
              },
            ],
          },
          {
            field: "propertyFloat1",
            operator: "gte",
            value: Date.now() - 3 * 30 * 24 * 60 * 60 * 1000,
          },
        ],
      },
    },
    {
      name: "International Enterprise Customers",
      description: "Non-US subscribers with companies and high spending",
      conditions: {
        $and: [
          {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
          {
            field: "country",
            operator: "ne",
            value: "US",
          },
          {
            field: "propertyString0",
            operator: "exists",
            value: true,
          },
          {
            field: "propertyFloat2",
            operator: "gte",
            value: 500,
          },
        ],
      },
    },
    {
      name: "Dormant Accounts",
      description:
        "Subscribed users with no purchase history or very old purchases",
      conditions: {
        $and: [
          {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
          {
            $or: [
              {
                field: "propertyFloat1",
                operator: "exists",
                value: false,
              },
              {
                field: "propertyFloat1",
                operator: "lte",
                value: Date.now() - 12 * 30 * 24 * 60 * 60 * 1000,
              },
            ],
          },
        ],
      },
    },
  ];

  const createdSegments = [];

  for (const segment of segments) {
    const existing = await prisma.segment.findFirst({
      where: { workspaceId, name: segment.name },
    });

    if (existing) {
      console.log(`  • Segment "${segment.name}" already exists`);
      createdSegments.push(existing);
    } else {
      const created = await prisma.segment.create({
        data: { ...segment, workspaceId },
      });
      console.log(`  ✓ Created segment: ${segment.name}`);
      createdSegments.push(created);
    }
  }

  return createdSegments;
}

/**
 * Generate a random contact status with weighted distribution
 */
function getRandomStatus(): ContactStatus {
  const rand = Math.random();

  // 60% subscribed, 20% unsubscribed, 10% bounced, 5% complained, 5% archived
  if (rand < 0.6) return "SUBSCRIBED";
  if (rand < 0.8) return "UNSUBSCRIBED";
  if (rand < 0.9) return "BOUNCED";
  if (rand < 0.95) return "COMPLAINED";
  return "ARCHIVED";
}

/**
 * Generate random dates for subscription lifecycle
 */
function getSubscriptionDates(status: ContactStatus) {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Everyone has a subscribed date in the past
  const subscribedAt = faker.date.between({ from: oneYearAgo, to: now });

  // Only unsubscribed/archived contacts have unsubscribed date
  const unsubscribedAt =
    status === "UNSUBSCRIBED" || status === "ARCHIVED"
      ? faker.date.between({ from: subscribedAt, to: now })
      : null;

  return { subscribedAt, unsubscribedAt };
}

/**
 * Generate a single contact with random data
 */
function generateContact(workspaceId: string) {
  const status = getRandomStatus();
  const { subscribedAt, unsubscribedAt } = getSubscriptionDates(status);

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email({ firstName, lastName }).toLowerCase();

  return {
    workspaceId,
    email,
    firstName,
    lastName,
    phone: Math.random() > 0.3 ? faker.phone.number() : null,
    country: Math.random() > 0.2 ? faker.location.countryCode() : null,
    timezone: Math.random() > 0.4 ? faker.location.timeZone() : null,
    city: Math.random() > 0.3 ? faker.location.city() : null,
    status,
    subscribedAt,
    unsubscribedAt,
    // Custom properties
    propertyFloat0:
      Math.random() > 0.2 ? faker.number.int({ min: 18, max: 80 }) : null, // Age
    propertyFloat1: Math.random() > 0.4 ? faker.date.past().getTime() : null, // Last Purchase Date
    propertyFloat2:
      Math.random() > 0.3
        ? faker.number.float({ min: 0, max: 5000, fractionDigits: 2 })
        : null, // Total Spent
    propertyString0: Math.random() > 0.3 ? faker.company.name() : null, // Company
    propertyString1: Math.random() > 0.4 ? faker.person.jobTitle() : null, // Job Title
    propertyString2: Math.random() > 0.85 ? "VIP" : null, // VIP Status (15% are VIP)
  };
}

/**
 * Seed contacts
 */
async function seedContacts(workspaceId: string, topicIds: string[]) {
  console.log(`\nSeeding ${CONTACT_COUNT} contacts...`);

  let totalCreated = 0;
  let totalTopicSubscriptions = 0;

  for (let i = 0; i < CONTACT_COUNT; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, CONTACT_COUNT - i);
    const contacts = Array.from({ length: batchSize }, () =>
      generateContact(workspaceId),
    );

    // Insert batch of contacts
    const result = await prisma.contact.createMany({
      data: contacts,
      skipDuplicates: true,
    });

    totalCreated += result.count;

    // Get the created contacts to create topic subscriptions
    const emails = contacts
      .map((c) => c.email)
      .filter((e): e is string => e !== null);
    const createdContacts = await prisma.contact.findMany({
      where: {
        workspaceId,
        email: { in: emails },
      },
      select: { id: true, status: true },
    });

    // Create topic subscriptions for each contact
    const topicSubscriptions = [];

    for (const contact of createdContacts) {
      // Each contact subscribes to 1-3 random topics
      const numTopics = faker.number.int({ min: 1, max: 3 });
      const selectedTopics = faker.helpers
        .shuffle(topicIds)
        .slice(0, numTopics);

      for (const topicId of selectedTopics) {
        // 80% subscribed, 20% unsubscribed to topics
        const topicStatus: TopicSubscriptionStatus =
          contact.status === "SUBSCRIBED" && Math.random() > 0.2
            ? "SUBSCRIBED"
            : "UNSUBSCRIBED";

        topicSubscriptions.push({
          contactId: contact.id,
          topicId,
          status: topicStatus,
        });
      }
    }

    if (topicSubscriptions.length > 0) {
      await prisma.contactTopic.createMany({
        data: topicSubscriptions,
        skipDuplicates: true,
      });
      totalTopicSubscriptions += topicSubscriptions.length;
    }

    console.log(
      `  ✓ Created batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(CONTACT_COUNT / BATCH_SIZE)} (${result.count} contacts)`,
    );
  }

  console.log(`\n✓ Created ${totalCreated} contacts`);
  console.log(`✓ Created ${totalTopicSubscriptions} topic subscriptions`);
}

/**
 * Main function
 */
async function main() {
  try {
    // Clean up existing data
    await cleanupExistingData(workspaceId);

    // Create test data
    const topics = await createTestTopics(workspaceId);
    const properties = await createTestContactProperties(workspaceId);
    const segments = await createTestSegments(workspaceId);

    // Seed contacts
    await seedContacts(
      workspaceId,
      topics.map((t) => t.id),
    );

    // Clear segment contacts cache to trigger recomputation
    console.log("\nClearing segment contacts cache...");
    const redis = getRedisClient();
    const cacheKey = getSegmentContactsKey(workspaceId);
    await redis.del(cacheKey);
    console.log("  ✓ Cache cleared");

    console.log("\n✅ Seeding complete!");
    console.log("\nSummary:");
    console.log(`  • ${topics.length} topics`);
    console.log(`  • ${properties.length} custom properties`);
    console.log(`  • ${segments.length} segments`);
    console.log(`  • ${CONTACT_COUNT} contacts`);

    console.log("\nContact distribution:");
    const stats = await prisma.contact.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: true,
    });

    for (const stat of stats) {
      console.log(`  • ${stat.status}: ${stat._count}`);
    }
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
