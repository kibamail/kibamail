import { describe, it, expect, beforeEach } from "vitest";
import { Kibamail } from "../kibamail";
import { MOCK_API_URL, MOCK_API_KEY } from "./setup";

describe("Topics Resource", () => {
  let kibamail: Kibamail;

  beforeEach(() => {
    kibamail = new Kibamail(MOCK_API_KEY, {
      baseURL: MOCK_API_URL,
    });
  });

  describe("create", () => {
    it("should create a topic with basic information", async () => {
      const result = await kibamail.topics.create({
        name: "Product Updates",
        visibility: "PUBLIC",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(201);
    });

    it("should create a topic with description", async () => {
      const result = await kibamail.topics.create({
        name: "Newsletter",
        visibility: "PUBLIC",
        description: "Weekly newsletter with company updates",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should create a private topic", async () => {
      const result = await kibamail.topics.create({
        name: "Internal Announcements",
        visibility: "PRIVATE",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should list all topics", async () => {
      const result = await kibamail.topics.list();

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });

    it("should list topics with pagination", async () => {
      const result = await kibamail.topics.list({
        limit: 20,
        after: "topic_abc123",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("get", () => {
    it("should retrieve a topic by ID", async () => {
      const topicId = "topic_test_12345";
      const result = await kibamail.topics.get(topicId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("update", () => {
    it("should update a topic's name", async () => {
      const topicId = "topic_test_12345";
      const result = await kibamail.topics.update(topicId, {
        name: "Updated Topic Name",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should update a topic's description", async () => {
      const topicId = "topic_test_12345";
      const result = await kibamail.topics.update(topicId, {
        description: "Updated description",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should update a topic's visibility", async () => {
      const topicId = "topic_test_12345";
      const result = await kibamail.topics.update(topicId, {
        visibility: "PRIVATE",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete a topic by ID", async () => {
      const topicId = "topic_test_12345";
      const result = await kibamail.topics.delete(topicId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });
});
