/**
 * Tests for Broadcast Recipient Fetcher
 *
 * Tests the recipient selection logic for different audience types:
 * - All contacts (no topic or segment specified)
 * - Topic-based audience
 * - Static segment
 * - Dynamic segment with conditions
 */

import { afterAll, describe, expect, test } from "vitest";
import { fetchBroadcastRecipientIds } from "@/lib/broadcasts/recipient-fetcher";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestContacts,
  createTestTopics,
  createTestWorkspace,
} from "@/tests/utils";

const workspacesToCleanup: string[] = [];

afterAll(async () => {
  for (const workspaceId of workspacesToCleanup) {
    await cleanupWorkspace(workspaceId);
  }
});

describe("fetchBroadcastRecipientIds", () => {
  describe("All contacts (no topic or segment)", () => {
    test("should return all subscribed contacts", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      await createTestContacts(workspace.id, [
        { email: "subscribed1@example.com", status: "SUBSCRIBED" },
        { email: "subscribed2@example.com", status: "SUBSCRIBED" },
        { email: "unsubscribed@example.com", status: "UNSUBSCRIBED" },
        { email: "bounced@example.com", status: "BOUNCED" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: null,
      });

      expect(contactIds.length).toBe(2);
    });

    test("should return empty array when no subscribed contacts exist", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      await createTestContacts(workspace.id, [
        { email: "unsubscribed@example.com", status: "UNSUBSCRIBED" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: null,
      });

      expect(contactIds.length).toBe(0);
    });
  });

  describe("Topic-based audience", () => {
    test("should return contacts subscribed to the topic", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const [topic] = await createTestTopics(workspace.id, [
        { name: "Newsletter" },
      ]);

      const contacts = await createTestContacts(workspace.id, [
        { email: "topic-subscribed1@example.com", status: "SUBSCRIBED" },
        { email: "topic-subscribed2@example.com", status: "SUBSCRIBED" },
        { email: "not-subscribed@example.com", status: "SUBSCRIBED" },
      ]);

      // Subscribe first two contacts to the topic
      await prisma.contactTopic.createMany({
        data: [
          {
            contactId: contacts[0].id,
            topicId: topic.id,
            status: "SUBSCRIBED",
          },
          {
            contactId: contacts[1].id,
            topicId: topic.id,
            status: "SUBSCRIBED",
          },
        ],
      });

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: topic.id,
        segmentId: null,
      });

      expect(contactIds.length).toBe(2);
      expect(contactIds).toContain(contacts[0].id);
      expect(contactIds).toContain(contacts[1].id);
      expect(contactIds).not.toContain(contacts[2].id);
    });

    test("should exclude contacts unsubscribed from topic", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const [topic] = await createTestTopics(workspace.id, [
        { name: "Updates" },
      ]);

      const contacts = await createTestContacts(workspace.id, [
        { email: "subscribed@example.com", status: "SUBSCRIBED" },
        { email: "unsubscribed-topic@example.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contactTopic.createMany({
        data: [
          {
            contactId: contacts[0].id,
            topicId: topic.id,
            status: "SUBSCRIBED",
          },
          {
            contactId: contacts[1].id,
            topicId: topic.id,
            status: "UNSUBSCRIBED",
          },
        ],
      });

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: topic.id,
        segmentId: null,
      });

      expect(contactIds.length).toBe(1);
      expect(contactIds).toContain(contacts[0].id);
    });

    test("should exclude globally unsubscribed contacts", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const [topic] = await createTestTopics(workspace.id, [
        { name: "Promotions" },
      ]);

      const contacts = await createTestContacts(workspace.id, [
        { email: "active@example.com", status: "SUBSCRIBED" },
        { email: "globally-unsub@example.com", status: "UNSUBSCRIBED" },
      ]);

      await prisma.contactTopic.createMany({
        data: [
          {
            contactId: contacts[0].id,
            topicId: topic.id,
            status: "SUBSCRIBED",
          },
          {
            contactId: contacts[1].id,
            topicId: topic.id,
            status: "SUBSCRIBED",
          },
        ],
      });

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: topic.id,
        segmentId: null,
      });

      expect(contactIds.length).toBe(1);
      expect(contactIds).toContain(contacts[0].id);
    });
  });

  describe("Static segment", () => {
    test("should return contacts in static segment", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "VIP Customers",
          type: "STATIC",
        },
      });

      const contacts = await createTestContacts(workspace.id, [
        { email: "vip1@example.com", status: "SUBSCRIBED" },
        { email: "vip2@example.com", status: "SUBSCRIBED" },
        { email: "regular@example.com", status: "SUBSCRIBED" },
      ]);

      // Add first two contacts to the static segment
      await prisma.contactSegment.createMany({
        data: [
          { contactId: contacts[0].id, segmentId: segment.id },
          { contactId: contacts[1].id, segmentId: segment.id },
        ],
      });

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(2);
      expect(contactIds).toContain(contacts[0].id);
      expect(contactIds).toContain(contacts[1].id);
      expect(contactIds).not.toContain(contacts[2].id);
    });

    test("should exclude unsubscribed contacts from static segment", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "Inactive Segment",
          type: "STATIC",
        },
      });

      const contacts = await createTestContacts(workspace.id, [
        { email: "active@example.com", status: "SUBSCRIBED" },
        { email: "inactive@example.com", status: "UNSUBSCRIBED" },
      ]);

      await prisma.contactSegment.createMany({
        data: [
          { contactId: contacts[0].id, segmentId: segment.id },
          { contactId: contacts[1].id, segmentId: segment.id },
        ],
      });

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(1);
      expect(contactIds).toContain(contacts[0].id);
    });
  });

  describe("Dynamic segment", () => {
    test("should filter contacts by field condition (country = US)", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "US Customers",
          type: "DYNAMIC",
          conditions: {
            field: "country",
            operator: "eq",
            value: "US",
          },
        },
      });

      await createTestContacts(workspace.id, [
        { email: "us1@example.com", status: "SUBSCRIBED", country: "US" },
        { email: "us2@example.com", status: "SUBSCRIBED", country: "US" },
        { email: "uk@example.com", status: "SUBSCRIBED", country: "UK" },
        { email: "ca@example.com", status: "SUBSCRIBED", country: "CA" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(2);
    });

    test("should filter contacts by $and condition", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "US with First Name",
          type: "DYNAMIC",
          conditions: {
            $and: [
              { field: "country", operator: "eq", value: "US" },
              { field: "firstName", operator: "exists", value: true },
            ],
          },
        },
      });

      await createTestContacts(workspace.id, [
        {
          email: "us-with-name@example.com",
          status: "SUBSCRIBED",
          country: "US",
          firstName: "John",
        },
        {
          email: "us-no-name@example.com",
          status: "SUBSCRIBED",
          country: "US",
        },
        {
          email: "uk-with-name@example.com",
          status: "SUBSCRIBED",
          country: "UK",
          firstName: "Jane",
        },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(1);
    });

    test("should filter contacts by $or condition", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "US or UK",
          type: "DYNAMIC",
          conditions: {
            $or: [
              { field: "country", operator: "eq", value: "US" },
              { field: "country", operator: "eq", value: "UK" },
            ],
          },
        },
      });

      await createTestContacts(workspace.id, [
        { email: "us@example.com", status: "SUBSCRIBED", country: "US" },
        { email: "uk@example.com", status: "SUBSCRIBED", country: "UK" },
        { email: "ca@example.com", status: "SUBSCRIBED", country: "CA" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(2);
    });

    test("should filter contacts by in operator", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "North America",
          type: "DYNAMIC",
          conditions: {
            field: "country",
            operator: "in",
            value: ["US", "CA", "MX"],
          },
        },
      });

      await createTestContacts(workspace.id, [
        { email: "us@example.com", status: "SUBSCRIBED", country: "US" },
        { email: "ca@example.com", status: "SUBSCRIBED", country: "CA" },
        { email: "mx@example.com", status: "SUBSCRIBED", country: "MX" },
        { email: "uk@example.com", status: "SUBSCRIBED", country: "UK" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(3);
    });

    test("should filter contacts by contains operator", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "Gmail Users",
          type: "DYNAMIC",
          conditions: {
            field: "email",
            operator: "contains",
            value: "gmail.com",
          },
        },
      });

      await createTestContacts(workspace.id, [
        { email: "user1@gmail.com", status: "SUBSCRIBED" },
        { email: "user2@gmail.com", status: "SUBSCRIBED" },
        { email: "user@yahoo.com", status: "SUBSCRIBED" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(2);
    });

    test("should filter by topic subscription condition", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const [topic] = await createTestTopics(workspace.id, [
        { name: "Premium" },
      ]);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "Premium Subscribers",
          type: "DYNAMIC",
          conditions: {
            subscribedToTopic: [topic.id],
          },
        },
      });

      const contacts = await createTestContacts(workspace.id, [
        { email: "premium1@example.com", status: "SUBSCRIBED" },
        { email: "premium2@example.com", status: "SUBSCRIBED" },
        { email: "regular@example.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contactTopic.createMany({
        data: [
          {
            contactId: contacts[0].id,
            topicId: topic.id,
            status: "SUBSCRIBED",
          },
          {
            contactId: contacts[1].id,
            topicId: topic.id,
            status: "SUBSCRIBED",
          },
        ],
      });

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(2);
      expect(contactIds).toContain(contacts[0].id);
      expect(contactIds).toContain(contacts[1].id);
    });

    test("should handle segment with no conditions (returns all subscribed)", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "All Contacts",
          type: "DYNAMIC",
          // No conditions - should return all subscribed contacts
        },
      });

      await createTestContacts(workspace.id, [
        { email: "contact1@example.com", status: "SUBSCRIBED" },
        { email: "contact2@example.com", status: "SUBSCRIBED" },
        { email: "unsub@example.com", status: "UNSUBSCRIBED" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(2);
    });

    test("should exclude globally unsubscribed contacts from dynamic segment", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "US Segment",
          type: "DYNAMIC",
          conditions: {
            field: "country",
            operator: "eq",
            value: "US",
          },
        },
      });

      await createTestContacts(workspace.id, [
        { email: "active-us@example.com", status: "SUBSCRIBED", country: "US" },
        {
          email: "unsub-us@example.com",
          status: "UNSUBSCRIBED",
          country: "US",
        },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: segment.id,
      });

      expect(contactIds.length).toBe(1);
    });
  });

  describe("Edge cases", () => {
    test("should return empty array for non-existent segment", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const contactIds = await fetchBroadcastRecipientIds(workspace.id, {
        topicId: null,
        segmentId: "non-existent-segment-id",
      });

      expect(contactIds.length).toBe(0);
    });

    test("should not return contacts from other workspaces", async () => {
      const workspace1 = createTestWorkspace();
      const workspace2 = createTestWorkspace();
      workspacesToCleanup.push(workspace1.id, workspace2.id);

      await createTestContacts(workspace1.id, [
        { email: "ws1@example.com", status: "SUBSCRIBED" },
      ]);

      await createTestContacts(workspace2.id, [
        { email: "ws2@example.com", status: "SUBSCRIBED" },
      ]);

      const contactIds = await fetchBroadcastRecipientIds(workspace1.id, {
        topicId: null,
        segmentId: null,
      });

      expect(contactIds.length).toBe(1);
    });
  });
});
