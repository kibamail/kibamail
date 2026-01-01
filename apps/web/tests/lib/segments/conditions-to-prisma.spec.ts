/**
 * Unit tests for Conditions to Prisma Query Converter
 *
 * Tests conversion of segment conditions to Prisma where clauses
 */

import { describe, expect, test } from "vitest";
import type { ConditionInput } from "@/app/(main)/api/v1/segments/schema";
import { conditionsToPrismaWhere } from "@/lib/segments/conditions-to-prisma";

describe("conditionsToPrismaWhere", () => {
  describe("Field Conditions", () => {
    test("should convert eq operator", () => {
      const result = conditionsToPrismaWhere({
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      });

      expect(result).toEqual({
        status: "SUBSCRIBED",
      });
    });

    test("should convert ne operator", () => {
      const result = conditionsToPrismaWhere({
        field: "status",
        operator: "ne",
        value: "UNSUBSCRIBED",
      });

      expect(result).toEqual({
        status: { not: "UNSUBSCRIBED" },
      });
    });

    test("should convert gt operator", () => {
      const result = conditionsToPrismaWhere({
        field: "createdAt",
        operator: "gt",
        value: "2024-01-01",
      });

      expect(result).toEqual({
        createdAt: { gt: "2024-01-01" },
      });
    });

    test("should convert gte operator", () => {
      const result = conditionsToPrismaWhere({
        field: "createdAt",
        operator: "gte",
        value: "2024-01-01",
      });

      expect(result).toEqual({
        createdAt: { gte: "2024-01-01" },
      });
    });

    test("should convert lt operator", () => {
      const result = conditionsToPrismaWhere({
        field: "createdAt",
        operator: "lt",
        value: "2024-12-31",
      });

      expect(result).toEqual({
        createdAt: { lt: "2024-12-31" },
      });
    });

    test("should convert lte operator", () => {
      const result = conditionsToPrismaWhere({
        field: "createdAt",
        operator: "lte",
        value: "2024-12-31",
      });

      expect(result).toEqual({
        createdAt: { lte: "2024-12-31" },
      });
    });

    test("should convert in operator", () => {
      const result = conditionsToPrismaWhere({
        field: "country",
        operator: "in",
        value: ["US", "CA", "UK"],
      });

      expect(result).toEqual({
        country: { in: ["US", "CA", "UK"] },
      });
    });

    test("should convert nin operator", () => {
      const result = conditionsToPrismaWhere({
        field: "country",
        operator: "nin",
        value: ["SPAM", "BLOCKED"],
      });

      expect(result).toEqual({
        country: { notIn: ["SPAM", "BLOCKED"] },
      });
    });

    test("should convert contains operator", () => {
      const result = conditionsToPrismaWhere({
        field: "email",
        operator: "contains",
        value: "@gmail.com",
      });

      expect(result).toEqual({
        email: { contains: "@gmail.com" },
      });
    });

    test("should convert startsWith operator", () => {
      const result = conditionsToPrismaWhere({
        field: "email",
        operator: "startsWith",
        value: "admin",
      });

      expect(result).toEqual({
        email: { startsWith: "admin" },
      });
    });

    test("should convert endsWith operator", () => {
      const result = conditionsToPrismaWhere({
        field: "email",
        operator: "endsWith",
        value: ".edu",
      });

      expect(result).toEqual({
        email: { endsWith: ".edu" },
      });
    });

    test("should convert exists operator with true value", () => {
      const result = conditionsToPrismaWhere({
        field: "phone",
        operator: "exists",
        value: true,
      });

      expect(result).toEqual({
        phone: { not: null },
      });
    });

    test("should convert exists operator with false value", () => {
      const result = conditionsToPrismaWhere({
        field: "phone",
        operator: "exists",
        value: false,
      });

      expect(result).toEqual({
        phone: null,
      });
    });
  });

  describe("Topic Conditions", () => {
    test("should convert subscribedToTopic condition", () => {
      const result = conditionsToPrismaWhere({
        subscribedToTopic: ["topic-id-1", "topic-id-2"],
      });

      expect(result).toEqual({
        topics: {
          some: {
            topicId: {
              in: ["topic-id-1", "topic-id-2"],
            },
            status: "SUBSCRIBED",
          },
        },
      });
    });

    test("should convert notSubscribedToTopic condition", () => {
      const result = conditionsToPrismaWhere({
        notSubscribedToTopic: ["marketing-topic-id"],
      });

      expect(result).toEqual({
        topics: {
          none: {
            topicId: {
              in: ["marketing-topic-id"],
            },
            status: "SUBSCRIBED",
          },
        },
      });
    });

    test("should convert combined subscribedToTopic and notSubscribedToTopic", () => {
      const result = conditionsToPrismaWhere({
        subscribedToTopic: ["newsletter-id"],
        notSubscribedToTopic: ["marketing-id"],
      });

      expect(result).toEqual({
        AND: [
          {
            topics: {
              some: {
                topicId: {
                  in: ["newsletter-id"],
                },
                status: "SUBSCRIBED",
              },
            },
          },
          {
            topics: {
              none: {
                topicId: {
                  in: ["marketing-id"],
                },
                status: "SUBSCRIBED",
              },
            },
          },
        ],
      });
    });
  });

  describe("Logical Operators", () => {
    test("should convert $and operator", () => {
      const result = conditionsToPrismaWhere({
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
      });

      expect(result).toEqual({
        AND: [
          { status: "SUBSCRIBED" },
          { country: "US" },
        ],
      });
    });

    test("should convert $or operator", () => {
      const result = conditionsToPrismaWhere({
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
      });

      expect(result).toEqual({
        OR: [
          { status: "BOUNCED" },
          { status: "COMPLAINED" },
        ],
      });
    });

    test("should convert $not operator", () => {
      const result = conditionsToPrismaWhere({
        $not: {
          field: "status",
          operator: "eq",
          value: "UNSUBSCRIBED",
        },
      });

      expect(result).toEqual({
        NOT: { status: "UNSUBSCRIBED" },
      });
    });
  });

  describe("Complex Nested Conditions", () => {
    test("should convert nested $and with multiple condition types", () => {
      const result = conditionsToPrismaWhere({
        $and: [
          {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
          {
            field: "country",
            operator: "in",
            value: ["US", "CA"],
          },
          {
            subscribedToTopic: ["newsletter-id"],
          },
        ],
      });

      expect(result).toEqual({
        AND: [
          { status: "SUBSCRIBED" },
          { country: { in: ["US", "CA"] } },
          {
            topics: {
              some: {
                topicId: {
                  in: ["newsletter-id"],
                },
                status: "SUBSCRIBED",
              },
            },
          },
        ],
      });
    });

    test("should convert deeply nested logical operators", () => {
      const result = conditionsToPrismaWhere({
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
      });

      expect(result).toEqual({
        AND: [
          { status: "SUBSCRIBED" },
          {
            OR: [
              { country: "US" },
              { country: "CA" },
            ],
          },
        ],
      });
    });

    test("should convert complex query with all condition types", () => {
      const result = conditionsToPrismaWhere({
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
            subscribedToTopic: ["newsletter-id"],
            notSubscribedToTopic: ["marketing-id"],
          },
          {
            field: "email",
            operator: "contains",
            value: "@company.com",
          },
        ],
      });

      expect(result).toEqual({
        AND: [
          { status: "SUBSCRIBED" },
          {
            OR: [
              { country: "US" },
              { country: "CA" },
            ],
          },
          {
            AND: [
              {
                topics: {
                  some: {
                    topicId: { in: ["newsletter-id"] },
                    status: "SUBSCRIBED",
                  },
                },
              },
              {
                topics: {
                  none: {
                    topicId: { in: ["marketing-id"] },
                    status: "SUBSCRIBED",
                  },
                },
              },
            ],
          },
          { email: { contains: "@company.com" } },
        ],
      });
    });

    test("should convert $not with nested conditions", () => {
      const result = conditionsToPrismaWhere({
        $not: {
          field: "status",
          operator: "eq",
          value: "UNSUBSCRIBED",
        },
      });

      expect(result).toEqual({
        NOT: { status: "UNSUBSCRIBED" },
      });
    });
  });

  describe("Error Handling", () => {
    test("should throw error for unsupported operator", () => {
      expect(() => {
        conditionsToPrismaWhere({
          field: "status",
          operator: "invalid_operator" as "eq",
          value: "test",
        });
      }).toThrow("Unsupported operator: invalid_operator");
    });

    test("should throw error for invalid condition structure", () => {
      expect(() => {
        conditionsToPrismaWhere({} as ConditionInput);
      }).toThrow("Invalid condition structure");
    });

    test("should throw error for empty logical operator", () => {
      expect(() => {
        conditionsToPrismaWhere({ $and: undefined, $or: undefined, $not: undefined } as ConditionInput);
      }).toThrow("Invalid logical operator structure");
    });
  });
});
