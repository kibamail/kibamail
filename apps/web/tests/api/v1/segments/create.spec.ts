/**
 * Integration tests for Segment Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/segments - Create new segment
 */

import { POST } from "@/app/(main)/api/v1/segments/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Setup: Create a test workspace and API keys for authentication
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/segments", () => {
  test("should create a new segment with simple condition", async () => {
    const segmentData = {
      name: "Active Subscribers",
      conditions: {
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("segment");
    expect(responseData.id).toBeDefined();
  });

  test("should create a segment with $and condition", async () => {
    const segmentData = {
      name: "High Value Customers",
      description: "Active subscribers in the US",
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
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("segment");
    expect(responseData.id).toBeDefined();
  });

  test("should create a segment with $or condition", async () => {
    const segmentData = {
      name: "Problem Contacts",
      conditions: {
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
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should create a segment with nested conditions", async () => {
    const segmentData = {
      name: "Complex Segment",
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
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should create a segment with $in operator", async () => {
    const segmentData = {
      name: "Multi Country",
      conditions: {
        field: "country",
        operator: "in",
        value: ["US", "CA", "UK"],
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should create a segment with string operators", async () => {
    const segmentData = {
      name: "Gmail Users",
      conditions: {
        field: "email",
        operator: "contains",
        value: "@gmail.com",
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should reject segment without conditions", async () => {
    const segmentData = {
      name: "No Conditions",
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject segment with empty name", async () => {
    const segmentData = {
      name: "",
      conditions: {
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject segment with name exceeding max length", async () => {
    const segmentData = {
      name: "A".repeat(101), // Exceeds 100 character limit
      conditions: {
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject segment with invalid operator", async () => {
    const segmentData = {
      name: "Invalid Operator",
      conditions: {
        field: "status",
        operator: "invalid",
        value: "SUBSCRIBED",
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with missing Authorization header", async () => {
    const segmentData = {
      name: "Test Segment",
      conditions: {
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      },
    };
    const request = apiRequest("/segments").method("POST").body(segmentData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request without write:segments scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:segments"],
    });

    const segmentData = {
      name: "Test Segment",
      conditions: {
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      },
    };
    const request = post("/segments", segmentData, readOnlyKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should trim whitespace from name", async () => {
    const segmentData = {
      name: "  Trimmed Segment  ",
      conditions: {
        field: "status",
        operator: "eq",
        value: "SUBSCRIBED",
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should create a segment with subscribedToTopic condition", async () => {
    const segmentData = {
      name: "Newsletter Subscribers",
      conditions: {
        subscribedToTopic: ["newsletter-topic-id", "updates-topic-id"],
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should create a segment with notSubscribedToTopic condition", async () => {
    const segmentData = {
      name: "Not Marketing Subscribers",
      conditions: {
        notSubscribedToTopic: ["marketing-topic-id"],
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should create segment with both subscribedToTopic and notSubscribedToTopic", async () => {
    const segmentData = {
      name: "Subscribed and Not Subscribed",
      conditions: {
        subscribedToTopic: ["topic-id-1"],
        notSubscribedToTopic: ["topic-id-2"],
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should reject segment with empty subscribedToTopic array", async () => {
    const segmentData = {
      name: "Empty Topic Array",
      conditions: {
        subscribedToTopic: [],
      },
    };
    const request = post("/segments", segmentData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});
