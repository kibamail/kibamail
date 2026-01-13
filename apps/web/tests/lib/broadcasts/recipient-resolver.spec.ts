/**
 * Tests for Broadcast Recipient Resolver
 *
 * Tests recipient resolution from various sources:
 * - Direct contact IDs
 * - Email addresses (with upsert)
 * - Segment ID
 * - Topic ID
 */

import { afterAll, describe, expect, test } from "vitest";
import { resolveRecipients } from "@/lib/broadcasts/recipient-resolver";
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

describe("resolveRecipients", () => {
  describe("By contact IDs", () => {
    test("should return contacts with properties by IDs", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const contacts = await createTestContacts(workspace.id, [
        { email: "contact1@ids.com", firstName: "John", lastName: "Doe", status: "SUBSCRIBED" },
        { email: "contact2@ids.com", firstName: "Jane", lastName: "Smith", status: "SUBSCRIBED" },
      ]);

      const result = await resolveRecipients(workspace.id, {
        contacts: contacts.map((c) => c.id),
      });

      expect(result.contactIds.length).toBe(2);
      expect(result.contacts.length).toBe(2);

      const contact1 = result.contacts.find((c) => c.email === "contact1@ids.com");
      const contact2 = result.contacts.find((c) => c.email === "contact2@ids.com");

      expect(contact1).toBeDefined();
      expect(contact1?.firstName).toBe("John");
      expect(contact1?.lastName).toBe("Doe");
      expect(contact2).toBeDefined();
      expect(contact2?.firstName).toBe("Jane");
      expect(contact2?.lastName).toBe("Smith");
    });

    test("should filter out non-existent contact IDs", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const contacts = await createTestContacts(workspace.id, [
        { email: "real@contact.com", status: "SUBSCRIBED" },
      ]);

      const result = await resolveRecipients(workspace.id, {
        contacts: [contacts[0].id, "non-existent-id"],
      });

      expect(result.contactIds.length).toBe(1);
      expect(result.contactIds).toContain(contacts[0].id);
    });

    test("should return empty for empty contacts array", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const result = await resolveRecipients(workspace.id, {
        contacts: [],
      });

      expect(result.contactIds.length).toBe(0);
      expect(result.contacts.length).toBe(0);
    });

    test("should filter out unsubscribed contacts", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const contacts = await createTestContacts(workspace.id, [
        { email: "subscribed@filter.com", status: "SUBSCRIBED" },
        { email: "unsubbed@filter.com", status: "UNSUBSCRIBED" },
      ]);

      const result = await resolveRecipients(workspace.id, {
        contacts: contacts.map((c) => c.id),
      });

      expect(result.contactIds.length).toBe(1);
      expect(result.contactIds).toContain(contacts[0].id);
    });
  });

  describe("By segment", () => {
    test("should return contacts from static segment", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "Static Segment",
          type: "STATIC",
        },
      });

      const contacts = await createTestContacts(workspace.id, [
        { email: "static1@segment.com", status: "SUBSCRIBED" },
        { email: "static2@segment.com", status: "SUBSCRIBED" },
        { email: "outside@segment.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contactSegment.createMany({
        data: [
          { contactId: contacts[0].id, segmentId: segment.id },
          { contactId: contacts[1].id, segmentId: segment.id },
        ],
      });

      const result = await resolveRecipients(workspace.id, {
        segment: segment.id,
      });

      expect(result.contactIds.length).toBe(2);
      expect(result.contacts.length).toBe(2);
      expect(result.contactIds).toContain(contacts[0].id);
      expect(result.contactIds).toContain(contacts[1].id);
      expect(result.contactIds).not.toContain(contacts[2].id);
    });

    test("should return contacts from dynamic segment", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const segment = await prisma.segment.create({
        data: {
          workspaceId: workspace.id,
          name: "Dynamic Segment",
          type: "DYNAMIC",
          conditions: { field: "country", operator: "eq", value: "US" },
        },
      });

      await createTestContacts(workspace.id, [
        { email: "us@dynamic.com", status: "SUBSCRIBED", country: "US" },
        { email: "uk@dynamic.com", status: "SUBSCRIBED", country: "UK" },
      ]);

      const result = await resolveRecipients(workspace.id, {
        segment: segment.id,
      });

      expect(result.contactIds.length).toBe(1);
      expect(result.contacts[0].email).toBe("us@dynamic.com");
    });

    test("should return empty for non-existent segment", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const result = await resolveRecipients(workspace.id, {
        segment: "non-existent-segment",
      });

      expect(result.contactIds.length).toBe(0);
      expect(result.contacts.length).toBe(0);
    });
  });

  describe("By topic", () => {
    test("should return contacts subscribed to topic", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const [topic] = await createTestTopics(workspace.id, [{ name: "Newsletter Topic" }]);

      const contacts = await createTestContacts(workspace.id, [
        { email: "topic-subbed@topic.com", status: "SUBSCRIBED" },
        { email: "topic-not-subbed@topic.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contactTopic.createMany({
        data: [
          { contactId: contacts[0].id, topicId: topic.id, status: "SUBSCRIBED" },
          { contactId: contacts[1].id, topicId: topic.id, status: "UNSUBSCRIBED" },
        ],
      });

      const result = await resolveRecipients(workspace.id, {
        topic: topic.id,
      });

      expect(result.contactIds.length).toBe(1);
      expect(result.contactIds).toContain(contacts[0].id);
    });

    test("should exclude globally unsubscribed contacts from topic", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const [topic] = await createTestTopics(workspace.id, [{ name: "Topic" }]);

      const contacts = await createTestContacts(workspace.id, [
        { email: "active@topic.com", status: "SUBSCRIBED" },
        { email: "global-unsub@topic.com", status: "UNSUBSCRIBED" },
      ]);

      await prisma.contactTopic.createMany({
        data: [
          { contactId: contacts[0].id, topicId: topic.id, status: "SUBSCRIBED" },
          { contactId: contacts[1].id, topicId: topic.id, status: "SUBSCRIBED" },
        ],
      });

      const result = await resolveRecipients(workspace.id, {
        topic: topic.id,
      });

      expect(result.contactIds.length).toBe(1);
      expect(result.contactIds).toContain(contacts[0].id);
    });
  });

  describe("Custom properties", () => {
    test("should include custom properties in contact data", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      const property = await prisma.contactProperty.create({
        data: {
          workspaceId: workspace.id,
          name: "Company",
          slot: "propertyString0",
          type: "STRING",
        },
      });

      const contacts = await createTestContacts(workspace.id, [
        { email: "with-prop@props.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contact.update({
        where: { id: contacts[0].id },
        data: { propertyString0: "Acme Inc" },
      });

      const result = await resolveRecipients(workspace.id, {
        contacts: [contacts[0].id],
      });

      expect(result.contacts.length).toBe(1);
      expect(result.contacts[0].properties.Company).toBe("Acme Inc");
    });

    test("should include multiple custom properties", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      await prisma.contactProperty.createMany({
        data: [
          { workspaceId: workspace.id, name: "Company", slot: "propertyString0", type: "STRING" },
          { workspaceId: workspace.id, name: "Job Title", slot: "propertyString1", type: "STRING" },
          { workspaceId: workspace.id, name: "Account Value", slot: "propertyFloat0", type: "NUMBER" },
        ],
      });

      const contacts = await createTestContacts(workspace.id, [
        { email: "multi-prop@props.com", status: "SUBSCRIBED" },
      ]);

      await prisma.contact.update({
        where: { id: contacts[0].id },
        data: {
          propertyString0: "Tech Corp",
          propertyString1: "Engineer",
          propertyFloat0: 5000,
        },
      });

      const result = await resolveRecipients(workspace.id, {
        contacts: [contacts[0].id],
      });

      expect(result.contacts[0].properties.Company).toBe("Tech Corp");
      expect(result.contacts[0].properties["Job Title"]).toBe("Engineer");
      expect(result.contacts[0].properties["Account Value"]).toBe(5000);
    });

    test("should handle missing properties as undefined", async () => {
      const workspace = createTestWorkspace();
      workspacesToCleanup.push(workspace.id);

      await prisma.contactProperty.create({
        data: {
          workspaceId: workspace.id,
          name: "Optional",
          slot: "propertyString0",
          type: "STRING",
        },
      });

      const contacts = await createTestContacts(workspace.id, [
        { email: "no-prop@props.com", status: "SUBSCRIBED" },
      ]);

      const result = await resolveRecipients(workspace.id, {
        contacts: [contacts[0].id],
      });

      expect(result.contacts[0].properties.Optional).toBeUndefined();
    });
  });

  describe("Workspace isolation", () => {
    test("should not return contacts from other workspaces", async () => {
      const workspace1 = createTestWorkspace();
      const workspace2 = createTestWorkspace();
      workspacesToCleanup.push(workspace1.id, workspace2.id);

      const contacts1 = await createTestContacts(workspace1.id, [
        { email: "ws1@isolation.com", status: "SUBSCRIBED" },
      ]);

      await createTestContacts(workspace2.id, [
        { email: "ws2@isolation.com", status: "SUBSCRIBED" },
      ]);

      const result = await resolveRecipients(workspace1.id, {
        contacts: [contacts1[0].id],
      });

      expect(result.contactIds.length).toBe(1);
      expect(result.contacts[0].email).toBe("ws1@isolation.com");
    });
  });
});
