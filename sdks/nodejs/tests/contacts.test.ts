import { describe, it, expect, beforeEach } from "vitest";
import { Kibamail } from "../kibamail";
import { MOCK_API_URL, MOCK_API_KEY } from "./setup";

describe("Contacts Resource", () => {
  let kibamail: Kibamail;

  beforeEach(() => {
    kibamail = new Kibamail(MOCK_API_KEY, {
      baseURL: MOCK_API_URL,
    });
  });

  describe("create", () => {
    it("should create a contact with basic information", async () => {
      const result = await kibamail.contacts.create({
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(201);
    });

    it("should create a contact with custom properties", async () => {
      const result = await kibamail.contacts.create({
        email: "jane.smith@example.com",
        firstName: "Jane",
        lastName: "Smith",
        properties: {
          Company: "Acme Inc",
          Plan: "Enterprise",
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should create a contact with topics", async () => {
      const result = await kibamail.contacts.create({
        email: "subscriber@example.com",
        firstName: "New",
        lastName: "Subscriber",
        topics: ["topic_newsletter", "topic_updates"],
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should list contacts with default pagination", async () => {
      const result = await kibamail.contacts.list();

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });

    it("should list contacts with custom limit", async () => {
      const result = await kibamail.contacts.list({ limit: 50 });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should list contacts with cursor pagination", async () => {
      const result = await kibamail.contacts.list({
        limit: 20,
        after: "contact_abc123",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("get", () => {
    it("should retrieve a contact by ID", async () => {
      const contactId = "contact_test_12345";
      const result = await kibamail.contacts.get(contactId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("update", () => {
    it("should update a contact's basic information", async () => {
      const contactId = "contact_test_12345";
      const result = await kibamail.contacts.update(contactId, {
        firstName: "Updated",
        lastName: "Name",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should update a contact's custom properties", async () => {
      const contactId = "contact_test_12345";
      const result = await kibamail.contacts.update(contactId, {
        properties: {
          Plan: "Pro",
          "Monthly Spend": 99.99,
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should update a contact's topic subscriptions", async () => {
      const contactId = "contact_test_12345";
      const result = await kibamail.contacts.update(contactId, {
        topics: ["topic_newsletter"],
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete a contact by ID", async () => {
      const contactId = "contact_test_12345";
      const result = await kibamail.contacts.delete(contactId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("search", () => {
    it("should search contacts with simple filter", async () => {
      const result = await kibamail.contacts.search({
        conditions: {
          $and: [
            {
              field: "status",
              operator: "eq",
              value: "SUBSCRIBED",
            },
          ],
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should search contacts with complex filters", async () => {
      const result = await kibamail.contacts.search({
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
                  field: "Plan",
                  operator: "eq",
                  value: "Enterprise",
                },
                {
                  field: "Plan",
                  operator: "eq",
                  value: "Pro",
                },
              ],
            },
          ],
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should search contacts with pagination", async () => {
      const result = await kibamail.contacts.search({
        conditions: {
          $and: [
            {
              field: "email",
              operator: "contains",
              value: "@example.com",
            },
          ],
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });
});
