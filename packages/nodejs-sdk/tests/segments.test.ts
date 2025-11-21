import { describe, it, expect, beforeEach } from "vitest";
import { Kibamail } from "../kibamail";
import { MOCK_API_URL, MOCK_API_KEY } from "./setup";

describe("Segments Resource", () => {
  let kibamail: Kibamail;

  beforeEach(() => {
    kibamail = new Kibamail(MOCK_API_KEY, {
      baseURL: MOCK_API_URL,
    });
  });

  describe("create", () => {
    it("should create a segment with basic conditions", async () => {
      const result = await kibamail.segments.create({
        name: "Active Subscribers",
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
      expect(result.response.status).toBe(201);
    });

    it("should create a segment with complex conditions", async () => {
      const result = await kibamail.segments.create({
        name: "Premium Customers",
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

    it("should create a segment with description", async () => {
      const result = await kibamail.segments.create({
        name: "High Value Customers",
        description: "Customers with monthly spend over $500",
        conditions: {
          $and: [
            {
              field: "Monthly Spend",
              operator: "gt",
              value: 500,
            },
          ],
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should list all segments", async () => {
      const result = await kibamail.segments.list();

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });

    it("should list segments with pagination", async () => {
      const result = await kibamail.segments.list({
        limit: 20,
        after: "segment_abc123",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("get", () => {
    it("should retrieve a segment by ID", async () => {
      const segmentId = "segment_test_12345";
      const result = await kibamail.segments.get(segmentId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("update", () => {
    it("should update a segment's name", async () => {
      const segmentId = "segment_test_12345";
      const result = await kibamail.segments.update(segmentId, {
        name: "Updated Segment Name",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should update a segment's conditions", async () => {
      const segmentId = "segment_test_12345";
      const result = await kibamail.segments.update(segmentId, {
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
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should update a segment's description", async () => {
      const segmentId = "segment_test_12345";
      const result = await kibamail.segments.update(segmentId, {
        description: "Updated description",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete a segment by ID", async () => {
      const segmentId = "segment_test_12345";
      const result = await kibamail.segments.delete(segmentId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("listContacts", () => {
    it("should list contacts in a segment", async () => {
      const segmentId = "segment_test_12345";
      const result = await kibamail.segments.listContacts(segmentId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });

    it("should list segment contacts with pagination", async () => {
      const segmentId = "segment_test_12345";
      const result = await kibamail.segments.listContacts(segmentId, {
        limit: 50,
        after: "contact_abc123",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });
});
