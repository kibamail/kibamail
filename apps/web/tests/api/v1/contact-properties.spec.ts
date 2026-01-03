/**
 * Integration tests for Contact Properties (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST   /api/v1/contact-properties - Create property
 * - GET    /api/v1/contact-properties - List properties
 * - GET    /api/v1/contact-properties/[id] - Get property
 * - PUT    /api/v1/contact-properties/[id] - Update property
 * - DELETE /api/v1/contact-properties/[id] - Delete property
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  DELETE as DELETE_PROPERTY,
  GET as GET_PROPERTY,
  PUT as UPDATE_PROPERTY,
} from "@/app/(main)/api/v1/contact-properties/[contactPropertyId]/route";
import {
  POST as CREATE_PROPERTY,
  GET as LIST_PROPERTIES,
} from "@/app/(main)/api/v1/contact-properties/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  del,
  get,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/contact-properties", () => {
  test("should create a contact property with DATE type", async () => {
    const timestampNow = Date.now().toString();
    const request = post(
      "/contact-properties",
      {
        name: "Registration Date",
        type: "DATE",
        defaultValue: timestampNow,
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("contact_property");
    expect(responseData.id).toBeDefined();
  });

  test("should create a contact property with NUMBER type", async () => {
    const request = post(
      "/contact-properties",
      {
        name: "Account Balance",
        type: "NUMBER",
        defaultValue: "1500.50",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("contact_property");
    expect(responseData.id).toBeDefined();
  });

  test("should create a contact property with STRING type", async () => {
    const request = post(
      "/contact-properties",
      {
        name: "Department",
        type: "STRING",
        defaultValue: "Engineering",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("contact_property");
    expect(responseData.id).toBeDefined();
  });

  test("should create a contact property without default value", async () => {
    const request = post(
      "/contact-properties",
      {
        name: "Optional Field",
        type: "STRING",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should reject DATE property with invalid timestamp", async () => {
    const request = post(
      "/contact-properties",
      {
        name: "Bad Date",
        type: "DATE",
        defaultValue: "not-a-timestamp",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject NUMBER property with invalid decimal", async () => {
    const request = post(
      "/contact-properties",
      {
        name: "Bad Number",
        type: "NUMBER",
        defaultValue: "abc123",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject STRING property with empty value", async () => {
    const request = post(
      "/contact-properties",
      {
        name: "Empty String",
        type: "STRING",
        defaultValue: "",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject property with invalid name characters", async () => {
    const request = post(
      "/contact-properties",
      {
        name: "Bad@Name#Here",
        type: "STRING",
        defaultValue: "value",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject property with duplicate name in same workspace", async () => {
    const propertyName = "Duplicate Test Property";

    // Create first property
    await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: propertyName,
          type: "STRING",
          defaultValue: "test",
        },
        fullAccessApiKey.key,
      ),
    );

    // Try to create duplicate
    const request = post(
      "/contact-properties",
      {
        name: propertyName,
        type: "STRING",
        defaultValue: "test2",
      },
      fullAccessApiKey.key,
    );

    const response = await CREATE_PROPERTY(request);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("GET /api/v1/contact-properties", () => {
  test("should list all contact properties for workspace", async () => {
    const request = get("/contact-properties", fullAccessApiKey.key);
    const response = await LIST_PROPERTIES(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_property_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.hasMore).toBeDefined();
  });

  test("should support cursor pagination", async () => {
    // Create multiple properties
    for (let i = 0; i < 5; i++) {
      await CREATE_PROPERTY(
        post(
          "/contact-properties",
          {
            name: `Pagination Test ${i}`,
            type: "STRING",
            defaultValue: `value${i}`,
          },
          fullAccessApiKey.key,
        ),
      );
    }

    // Get first page
    const firstRequest = get(
      "/contact-properties?limit=2",
      fullAccessApiKey.key,
    );
    const firstResponse = await LIST_PROPERTIES(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstData.data).toHaveLength(2);

    // Get second page
    const lastIdFromFirstPage = firstData.data[firstData.data.length - 1].id;
    const secondRequest = get(
      `/contact-properties?limit=2&after=${lastIdFromFirstPage}`,
      fullAccessApiKey.key,
    );
    const secondResponse = await LIST_PROPERTIES(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondData.data.length).toBeGreaterThan(0);
    // Verify no overlap
    const secondIds = secondData.data.map((p: any) => p.id);
    expect(secondIds).not.toContain(lastIdFromFirstPage);
  });

  test("should not expose slot field in list response", async () => {
    const request = get("/contact-properties", fullAccessApiKey.key);
    const response = await LIST_PROPERTIES(request);
    const responseData = await response.json();

    for (const property of responseData.data) {
      expect(property.slot).toBeUndefined();
      expect(property.id).toBeDefined();
      expect(property.name).toBeDefined();
      expect(property.type).toBeDefined();
    }
  });
});

describe("GET /api/v1/contact-properties/[contactPropertyId]", () => {
  test("should get a specific contact property", async () => {
    // Create a property
    const createResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Get Test Property",
          type: "NUMBER",
          defaultValue: "42.5",
        },
        fullAccessApiKey.key,
      ),
    );
    const { id } = await createResponse.json();

    // Get the property
    const request = get(`/contact-properties/${id}`, fullAccessApiKey.key);
    const response = await GET_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact_property");
    expect(responseData.id).toBe(id);
    expect(responseData.name).toBe("Get Test Property");
    expect(responseData.type).toBe("NUMBER");
    expect(responseData.defaultValue).toBe("42.5");
    expect(responseData.slot).toBeUndefined();
  });

  test("should return 404 for non-existent property", async () => {
    const request = get(
      "/contact-properties/non-existent-id",
      fullAccessApiKey.key,
    );
    const response = await GET_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: "non-existent-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("PUT /api/v1/contact-properties/[contactPropertyId]", () => {
  test("should update contact property name", async () => {
    // Create a property
    const createResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Original Name",
          type: "STRING",
          defaultValue: "value",
        },
        fullAccessApiKey.key,
      ),
    );
    const { id } = await createResponse.json();

    // Update the property
    const request = put(
      `/contact-properties/${id}`,
      { name: "Updated Name" },
      fullAccessApiKey.key,
    );
    const response = await UPDATE_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: id }),
    });

    expect(response.status).toBe(200);

    // Verify the update
    const getResponse = await GET_PROPERTY(
      get(`/contact-properties/${id}`, fullAccessApiKey.key),
      {
        params: Promise.resolve({ contactPropertyId: id }),
      },
    );
    const getData = await getResponse.json();
    expect(getData.name).toBe("Updated Name");
  });

  test("should update contact property default value", async () => {
    // Create a property
    const createResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Update Default Test",
          type: "NUMBER",
          defaultValue: "100",
        },
        fullAccessApiKey.key,
      ),
    );
    const { id } = await createResponse.json();

    // Update default value
    const request = put(
      `/contact-properties/${id}`,
      { defaultValue: "200.5" },
      fullAccessApiKey.key,
    );
    const response = await UPDATE_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: id }),
    });

    expect(response.status).toBe(200);

    // Verify the update
    const getResponse = await GET_PROPERTY(
      get(`/contact-properties/${id}`, fullAccessApiKey.key),
      {
        params: Promise.resolve({ contactPropertyId: id }),
      },
    );
    const getData = await getResponse.json();
    expect(getData.defaultValue).toBe("200.5");
  });

  test("should reject invalid default value for NUMBER type", async () => {
    // Create a NUMBER property
    const createResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Number Validation Test",
          type: "NUMBER",
          defaultValue: "100",
        },
        fullAccessApiKey.key,
      ),
    );
    const { id } = await createResponse.json();

    // Try to update with invalid number
    const request = put(
      `/contact-properties/${id}`,
      { defaultValue: "not-a-number" },
      fullAccessApiKey.key,
    );
    const response = await UPDATE_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject invalid default value for DATE type", async () => {
    // Create a DATE property
    const createResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Date Validation Test",
          type: "DATE",
          defaultValue: Date.now().toString(),
        },
        fullAccessApiKey.key,
      ),
    );
    const { id } = await createResponse.json();

    // Try to update with invalid date
    const request = put(
      `/contact-properties/${id}`,
      { defaultValue: "invalid-date" },
      fullAccessApiKey.key,
    );
    const response = await UPDATE_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should return 404 for non-existent property", async () => {
    const request = put(
      "/contact-properties/non-existent-id",
      { name: "Updated" },
      fullAccessApiKey.key,
    );
    const response = await UPDATE_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: "non-existent-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("DELETE /api/v1/contact-properties/[contactPropertyId]", () => {
  test("should delete contact property", async () => {
    // Create a property
    const createResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Delete Test Property",
          type: "STRING",
          defaultValue: "value",
        },
        fullAccessApiKey.key,
      ),
    );
    const { id } = await createResponse.json();

    // Delete the property
    const request = del(`/contact-properties/${id}`, fullAccessApiKey.key);
    const response = await DELETE_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: id }),
    });

    expect(response.status).toBe(200);

    // Verify it's deleted (soft delete - should return 404)
    const getResponse = await GET_PROPERTY(
      get(`/contact-properties/${id}`, fullAccessApiKey.key),
      {
        params: Promise.resolve({ contactPropertyId: id }),
      },
    );
    expect(getResponse.status).toBe(404);
  });

  test("should return 404 when deleting non-existent property", async () => {
    const request = del(
      "/contact-properties/non-existent-id",
      fullAccessApiKey.key,
    );
    const response = await DELETE_PROPERTY(request, {
      params: Promise.resolve({ contactPropertyId: "non-existent-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should allow reusing property name after soft delete", async () => {
    const propertyName = "Reusable Name Test";

    // Create property
    const createResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: propertyName,
          type: "STRING",
          defaultValue: "value1",
        },
        fullAccessApiKey.key,
      ),
    );
    const { id } = await createResponse.json();

    // Delete property
    await DELETE_PROPERTY(
      del(`/contact-properties/${id}`, fullAccessApiKey.key),
      {
        params: Promise.resolve({ contactPropertyId: id }),
      },
    );

    // Create new property with same name
    const secondCreateRequest = post(
      "/contact-properties",
      {
        name: propertyName,
        type: "STRING",
        defaultValue: "value2",
      },
      fullAccessApiKey.key,
    );

    const secondCreateResponse = await CREATE_PROPERTY(secondCreateRequest);
    expect(secondCreateResponse.status).toBe(201);
  });
});

describe("Slot Assignment", () => {
  test("should auto-assign slots for different types", async () => {
    // Create properties of different types
    const numResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Slot Test Number",
          type: "NUMBER",
          defaultValue: "1",
        },
        fullAccessApiKey.key,
      ),
    );

    const dateResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Slot Test Date",
          type: "DATE",
          defaultValue: Date.now().toString(),
        },
        fullAccessApiKey.key,
      ),
    );

    const stringResponse = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        {
          name: "Slot Test String",
          type: "STRING",
          defaultValue: "test",
        },
        fullAccessApiKey.key,
      ),
    );

    expect(numResponse.status).toBe(201);
    expect(dateResponse.status).toBe(201);
    expect(stringResponse.status).toBe(201);
  });
});
