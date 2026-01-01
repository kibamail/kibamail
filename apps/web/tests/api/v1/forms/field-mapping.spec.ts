/**
 * Integration tests for Form Field Mapping
 *
 * Tests the field mapping generation during form publishing:
 * - Field extraction from SurveyJS schemas
 * - Slot assignment (string vs numeric)
 * - Slot preservation across versions
 * - Mapping inheritance from parent forms
 */

import { POST as PUBLISH_FORM } from "@/app/(main)/api/v1/forms/[formId]/publish/route";
import { POST as CREATE_VERSION } from "@/app/(main)/api/v1/forms/[formId]/versions/route";
import { POST as CREATE_FORM } from "@/app/(main)/api/v1/forms/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  cleanupWorkspace,
  post,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { prisma } from "@/lib/db";
import {
  extractFieldsFromSchema,
  generateFieldMapping,
  getStorageType,
  getSlotCounts,
} from "@/lib/forms/field-mapping";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("extractFieldsFromSchema - Unit Tests", () => {
  test("should extract fields from paged schema", () => {
    const schema = {
      pages: [
        {
          elements: [
            { type: "text", name: "firstName", title: "First Name" },
            { type: "text", name: "lastName", title: "Last Name" },
          ],
        },
        {
          elements: [
            { type: "text", name: "email", title: "Email" },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(3);
    expect(fields[0]).toEqual({ name: "firstName", type: "text", title: "First Name" });
    expect(fields[1]).toEqual({ name: "lastName", type: "text", title: "Last Name" });
    expect(fields[2]).toEqual({ name: "email", type: "text", title: "Email" });
  });

  test("should extract fields from flat schema", () => {
    const schema = {
      elements: [
        { type: "text", name: "name" },
        { type: "dropdown", name: "country" },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe("name");
    expect(fields[1].name).toBe("country");
  });

  test("should extract nested fields from panels", () => {
    const schema = {
      pages: [
        {
          elements: [
            {
              type: "panel",
              name: "contactPanel",
              elements: [
                { type: "text", name: "phone", title: "Phone" },
                { type: "text", name: "address", title: "Address" },
              ],
            },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe("phone");
    expect(fields[1].name).toBe("address");
  });

  test("should handle deeply nested panels", () => {
    const schema = {
      pages: [
        {
          elements: [
            {
              type: "panel",
              name: "outer",
              elements: [
                { type: "text", name: "field1" },
                {
                  type: "panel",
                  name: "inner",
                  elements: [
                    { type: "text", name: "field2" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(2);
    expect(fields.map(f => f.name)).toEqual(["field1", "field2"]);
  });

  test("should skip elements without name", () => {
    const schema = {
      pages: [
        {
          elements: [
            { type: "html", content: "<p>Hello</p>" }, // No name
            { type: "text", name: "validField" },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("validField");
  });

  test("should return empty array for null/undefined schema", () => {
    expect(extractFieldsFromSchema(null)).toEqual([]);
    expect(extractFieldsFromSchema(undefined)).toEqual([]);
    expect(extractFieldsFromSchema({})).toEqual([]);
  });

  test("should extract all SurveyJS field types", () => {
    const schema = {
      pages: [
        {
          elements: [
            { type: "text", name: "textField" },
            { type: "comment", name: "commentField" },
            { type: "dropdown", name: "dropdownField" },
            { type: "checkbox", name: "checkboxField" },
            { type: "radiogroup", name: "radioField" },
            { type: "rating", name: "ratingField" },
            { type: "file", name: "fileField" },
            { type: "boolean", name: "booleanField" },
            { type: "matrix", name: "matrixField" },
            { type: "multipletext", name: "multipletextField" },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(10);
    expect(fields.map(f => f.type)).toEqual([
      "text", "comment", "dropdown", "checkbox", "radiogroup",
      "rating", "file", "boolean", "matrix", "multipletext",
    ]);
  });
});

describe("getStorageType - Unit Tests", () => {
  test("should return 'number' for numeric field types", () => {
    expect(getStorageType("rating")).toBe("number");
    expect(getStorageType("nouislider")).toBe("number");
    expect(getStorageType("slider")).toBe("number");
    expect(getStorageType("expression")).toBe("number");
  });

  test("should return 'string' for all other field types", () => {
    expect(getStorageType("text")).toBe("string");
    expect(getStorageType("comment")).toBe("string");
    expect(getStorageType("dropdown")).toBe("string");
    expect(getStorageType("checkbox")).toBe("string");
    expect(getStorageType("radiogroup")).toBe("string");
    expect(getStorageType("file")).toBe("string");
    expect(getStorageType("boolean")).toBe("string");
    expect(getStorageType("matrix")).toBe("string");
  });
});

describe("generateFieldMapping - Unit Tests", () => {
  test("should generate mapping with correct slot assignments", () => {
    const schema = {
      pages: [
        {
          elements: [
            { type: "text", name: "email", title: "Email Address" },
            { type: "text", name: "name" },
            { type: "rating", name: "satisfaction" },
          ],
        },
      ],
    };

    const mapping = generateFieldMapping(schema, null);

    expect(mapping.email).toEqual({
      slot: "fieldString0",
      type: "string",
      fieldType: "text",
      title: "Email Address",
    });
    expect(mapping.name).toEqual({
      slot: "fieldString1",
      type: "string",
      fieldType: "text",
      title: undefined,
    });
    expect(mapping.satisfaction).toEqual({
      slot: "fieldNum0",
      type: "number",
      fieldType: "rating",
      title: undefined,
    });
  });

  test("should preserve existing slot assignments from parent mapping", () => {
    const existingMapping = {
      email: { slot: "fieldString5", type: "string" as const, fieldType: "text" },
      rating: { slot: "fieldNum3", type: "number" as const, fieldType: "rating" },
    };

    const schema = {
      pages: [
        {
          elements: [
            { type: "text", name: "email" }, // Existing field
            { type: "rating", name: "rating" }, // Existing field
            { type: "text", name: "newField" }, // New field
          ],
        },
      ],
    };

    const mapping = generateFieldMapping(schema, existingMapping);

    // Existing fields keep their slots
    expect(mapping.email.slot).toBe("fieldString5");
    expect(mapping.rating.slot).toBe("fieldNum3");

    // New field gets next available slot (not 5, which is taken)
    expect(mapping.newField.slot).toBe("fieldString0");
    expect(mapping.newField.type).toBe("string");
  });

  test("should assign sequential slots when starting fresh", () => {
    const schema = {
      pages: [
        {
          elements: [
            { type: "text", name: "field1" },
            { type: "text", name: "field2" },
            { type: "text", name: "field3" },
            { type: "rating", name: "num1" },
            { type: "rating", name: "num2" },
          ],
        },
      ],
    };

    const mapping = generateFieldMapping(schema, null);

    expect(mapping.field1.slot).toBe("fieldString0");
    expect(mapping.field2.slot).toBe("fieldString1");
    expect(mapping.field3.slot).toBe("fieldString2");
    expect(mapping.num1.slot).toBe("fieldNum0");
    expect(mapping.num2.slot).toBe("fieldNum1");
  });

  test("should update title for existing fields if changed", () => {
    const existingMapping = {
      email: { slot: "fieldString0", type: "string" as const, fieldType: "text", title: "Old Title" },
    };

    const schema = {
      pages: [
        {
          elements: [
            { type: "text", name: "email", title: "New Title" },
          ],
        },
      ],
    };

    const mapping = generateFieldMapping(schema, existingMapping);

    expect(mapping.email.slot).toBe("fieldString0"); // Slot preserved
    expect(mapping.email.title).toBe("New Title"); // Title updated
  });

  test("should keep removed fields in mapping for historical data", () => {
    const existingMapping = {
      email: { slot: "fieldString0", type: "string" as const, fieldType: "text" },
      removedField: { slot: "fieldString1", type: "string" as const, fieldType: "text" },
    };

    const schema = {
      pages: [
        {
          elements: [
            { type: "text", name: "email" }, // Only email remains
          ],
        },
      ],
    };

    const mapping = generateFieldMapping(schema, existingMapping);

    // Both fields should still be in mapping
    expect(mapping.email).toBeDefined();
    expect(mapping.removedField).toBeDefined();
    expect(mapping.removedField.slot).toBe("fieldString1");
  });
});

describe("getSlotCounts - Unit Tests", () => {
  test("should count string and number slots correctly", () => {
    const mapping = {
      field1: { slot: "fieldString0", type: "string" as const, fieldType: "text" },
      field2: { slot: "fieldString1", type: "string" as const, fieldType: "text" },
      field3: { slot: "fieldNum0", type: "number" as const, fieldType: "rating" },
    };

    const counts = getSlotCounts(mapping);

    expect(counts.stringSlots).toBe(2);
    expect(counts.numSlots).toBe(1);
    expect(counts.maxStringSlots).toBe(40);
    expect(counts.maxNumSlots).toBe(15);
  });
});

describe("Field Mapping Integration - Publishing", () => {
  test("should generate field mapping when publishing root form", async () => {
    const formFields = {
      pages: [
        {
          elements: [
            { type: "text", name: "email", title: "Email Address" },
            { type: "comment", name: "message", title: "Your Message" },
            { type: "rating", name: "satisfaction", title: "Satisfaction" },
          ],
        },
      ],
    };

    // Create form
    const createRequest = post(
      "/forms",
      { name: "Contact Form", fields: formFields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    // Publish form
    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key
    );
    await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    // Verify field mapping was generated
    const publishedForm = await prisma.form.findUnique({
      where: { id: createdForm.id },
    });

    expect(publishedForm?.fieldMapping).not.toBeNull();

    const mapping = publishedForm?.fieldMapping as Record<string, unknown>;

    expect(mapping.email).toEqual({
      slot: "fieldString0",
      type: "string",
      fieldType: "text",
      title: "Email Address",
    });
    expect(mapping.message).toEqual({
      slot: "fieldString1",
      type: "string",
      fieldType: "comment",
      title: "Your Message",
    });
    expect(mapping.satisfaction).toEqual({
      slot: "fieldNum0",
      type: "number",
      fieldType: "rating",
      title: "Satisfaction",
    });
  });

  test("should preserve slot assignments when publishing new version", async () => {
    const v1Fields = {
      pages: [
        {
          elements: [
            { type: "text", name: "email" },
            { type: "text", name: "name" },
          ],
        },
      ],
    };

    // Create and publish v1
    const createRequest = post(
      "/forms",
      { name: "Form V1", fields: v1Fields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) }
    );

    // Get v1 mapping
    const v1Form = await prisma.form.findUnique({ where: { id: rootForm.id } });
    const v1Mapping = v1Form?.fieldMapping as Record<string, { slot: string }>;

    expect(v1Mapping.email.slot).toBe("fieldString0");
    expect(v1Mapping.name.slot).toBe("fieldString1");

    // Create v2 with additional field
    const v2Fields = {
      pages: [
        {
          elements: [
            { type: "text", name: "email" }, // Existing
            { type: "text", name: "name" }, // Existing
            { type: "text", name: "phone" }, // New
          ],
        },
      ],
    };

    // First update v1 to have v2 fields (simulating editing before creating version)
    // Actually, we need to create a version
    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v2Fields },
      fullAccessApiKey.key
    );
    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await versionResponse.json();

    // Publish v2
    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) }
    );

    // Get v2 mapping
    const v2Form = await prisma.form.findUnique({ where: { id: version2.id } });
    const v2Mapping = v2Form?.fieldMapping as Record<string, { slot: string }>;

    // Existing fields should keep their slots
    expect(v2Mapping.email.slot).toBe("fieldString0");
    expect(v2Mapping.name.slot).toBe("fieldString1");

    // New field should get next available slot
    expect(v2Mapping.phone.slot).toBe("fieldString2");

    // Root form should also have updated mapping
    const updatedRoot = await prisma.form.findUnique({ where: { id: rootForm.id } });
    const rootMapping = updatedRoot?.fieldMapping as Record<string, { slot: string }>;

    expect(rootMapping.email.slot).toBe("fieldString0");
    expect(rootMapping.name.slot).toBe("fieldString1");
    expect(rootMapping.phone.slot).toBe("fieldString2");
  });

  test("should handle numeric fields correctly across versions", async () => {
    const v1Fields = {
      pages: [
        {
          elements: [
            { type: "text", name: "email" },
            { type: "rating", name: "rating1" },
          ],
        },
      ],
    };

    // Create and publish v1
    const createRequest = post(
      "/forms",
      { name: "Rating Form", fields: v1Fields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) }
    );

    const v1Form = await prisma.form.findUnique({ where: { id: rootForm.id } });
    const v1Mapping = v1Form?.fieldMapping as Record<string, { slot: string; type: string }>;

    expect(v1Mapping.email.slot).toBe("fieldString0");
    expect(v1Mapping.email.type).toBe("string");
    expect(v1Mapping.rating1.slot).toBe("fieldNum0");
    expect(v1Mapping.rating1.type).toBe("number");

    // Create v2 with another rating field
    const v2Fields = {
      pages: [
        {
          elements: [
            { type: "text", name: "email" },
            { type: "rating", name: "rating1" },
            { type: "rating", name: "rating2" }, // New numeric field
          ],
        },
      ],
    };

    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v2Fields },
      fullAccessApiKey.key
    );
    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await versionResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) }
    );

    const v2Form = await prisma.form.findUnique({ where: { id: version2.id } });
    const v2Mapping = v2Form?.fieldMapping as Record<string, { slot: string; type: string }>;

    expect(v2Mapping.rating1.slot).toBe("fieldNum0");
    expect(v2Mapping.rating2.slot).toBe("fieldNum1");
    expect(v2Mapping.rating2.type).toBe("number");
  });

  test("should handle complex nested panel structures", async () => {
    const formFields = {
      pages: [
        {
          elements: [
            {
              type: "panel",
              name: "personalInfo",
              elements: [
                { type: "text", name: "firstName" },
                { type: "text", name: "lastName" },
              ],
            },
            {
              type: "panel",
              name: "contactInfo",
              elements: [
                { type: "text", name: "email" },
                { type: "text", name: "phone" },
              ],
            },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "Nested Form", fields: formFields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) }
    );

    const publishedForm = await prisma.form.findUnique({ where: { id: form.id } });
    const mapping = publishedForm?.fieldMapping as Record<string, { slot: string }>;

    // All nested fields should be extracted and mapped
    expect(mapping.firstName.slot).toBe("fieldString0");
    expect(mapping.lastName.slot).toBe("fieldString1");
    expect(mapping.email.slot).toBe("fieldString2");
    expect(mapping.phone.slot).toBe("fieldString3");
  });

  test("should reject publishing form with no fields", async () => {
    const formFields = {
      pages: [
        {
          elements: [],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "Empty Form", fields: formFields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    const publishResponse = await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) }
    );

    expect(publishResponse.status).toBe(400);

    const error = await publishResponse.json();
    expect(error.error.code).toBe("FORM_NO_FIELDS");
    expect(error.error.message).toContain("at least one field");

    // Verify form was not published
    const unpublishedForm = await prisma.form.findUnique({ where: { id: form.id } });
    expect(unpublishedForm?.status).toBe("DRAFT");
    expect(unpublishedForm?.fieldMapping).toBeNull();
  });

  test("should reject publishing form without email field", async () => {
    const formFields = {
      pages: [
        {
          elements: [
            { type: "text", name: "firstName", title: "First Name" },
            { type: "text", name: "lastName", title: "Last Name" },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "No Email Form", fields: formFields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    const publishResponse = await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) }
    );

    expect(publishResponse.status).toBe(400);

    const error = await publishResponse.json();
    expect(error.error.code).toBe("FORM_MISSING_EMAIL_FIELD");
    expect(error.error.message).toContain("email");

    // Verify form was not published
    const unpublishedForm = await prisma.form.findUnique({ where: { id: form.id } });
    expect(unpublishedForm?.status).toBe("DRAFT");
    expect(unpublishedForm?.fieldMapping).toBeNull();
  });

  test("should reject publishing form with email field that has wrong name", async () => {
    const formFields = {
      pages: [
        {
          elements: [
            { type: "text", name: "userEmail", title: "Email Address" },
            { type: "text", name: "name", title: "Name" },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "Wrong Email Name Form", fields: formFields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    const publishResponse = await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) }
    );

    expect(publishResponse.status).toBe(400);

    const error = await publishResponse.json();
    expect(error.error.code).toBe("FORM_MISSING_EMAIL_FIELD");

    // Verify form was not published
    const unpublishedForm = await prisma.form.findUnique({ where: { id: form.id } });
    expect(unpublishedForm?.status).toBe("DRAFT");
  });

  test("should successfully publish form with email field named 'email'", async () => {
    const formFields = {
      pages: [
        {
          elements: [
            { type: "text", name: "email", title: "Email Address" },
            { type: "text", name: "name", title: "Name" },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "Valid Email Form", fields: formFields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    const publishResponse = await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) }
    );

    expect(publishResponse.status).toBe(200);

    // Verify form was published
    const publishedForm = await prisma.form.findUnique({ where: { id: form.id } });
    expect(publishedForm?.status).toBe("PUBLISHED");
    expect(publishedForm?.fieldMapping).not.toBeNull();
  });

  test("should handle various SurveyJS field types", async () => {
    const formFields = {
      pages: [
        {
          elements: [
            { type: "text", name: "email" }, // Required email field
            { type: "text", name: "textField" },
            { type: "comment", name: "commentField" },
            { type: "dropdown", name: "dropdownField" },
            { type: "checkbox", name: "checkboxField" },
            { type: "radiogroup", name: "radioField" },
            { type: "rating", name: "ratingField" },
            { type: "file", name: "fileField" },
            { type: "boolean", name: "booleanField" },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "All Types Form", fields: formFields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) }
    );

    const publishedForm = await prisma.form.findUnique({ where: { id: form.id } });
    const mapping = publishedForm?.fieldMapping as Record<string, { slot: string; type: string; fieldType: string }>;

    // String types
    expect(mapping.textField.type).toBe("string");
    expect(mapping.commentField.type).toBe("string");
    expect(mapping.dropdownField.type).toBe("string");
    expect(mapping.checkboxField.type).toBe("string");
    expect(mapping.radioField.type).toBe("string");
    expect(mapping.fileField.type).toBe("string");
    expect(mapping.booleanField.type).toBe("string");

    // Numeric type
    expect(mapping.ratingField.type).toBe("number");
    expect(mapping.ratingField.slot).toBe("fieldNum0");

    // Verify fieldType is preserved
    expect(mapping.textField.fieldType).toBe("text");
    expect(mapping.ratingField.fieldType).toBe("rating");
  });

  test("should maintain slot assignments after rollback and roll-forward", async () => {
    const v1Fields = {
      pages: [{ elements: [
        { type: "text", name: "email" },
        { type: "text", name: "field1" },
      ] }],
    };

    // Create and publish v1
    const createRequest = post(
      "/forms",
      { name: "Rollback Test", fields: v1Fields },
      fullAccessApiKey.key
    );
    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) }
    );

    // Create and publish v2 with new field
    const v2Fields = {
      pages: [{ elements: [
        { type: "text", name: "email" },
        { type: "text", name: "field1" },
        { type: "text", name: "field2" },
      ] }],
    };

    const v2Request = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v2Fields },
      fullAccessApiKey.key
    );
    const v2Response = await CREATE_VERSION(v2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await v2Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) }
    );

    // Create and publish v3 with another field
    const v3Fields = {
      pages: [{ elements: [
        { type: "text", name: "email" },
        { type: "text", name: "field1" },
        { type: "text", name: "field2" },
        { type: "text", name: "field3" },
      ] }],
    };

    const v3Request = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v3Fields },
      fullAccessApiKey.key
    );
    const v3Response = await CREATE_VERSION(v3Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version3 = await v3Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) }
    );

    // Rollback to v2
    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) }
    );

    // Get mapping after rollback
    const afterRollback = await prisma.form.findUnique({ where: { id: version2.id } });
    const rollbackMapping = afterRollback?.fieldMapping as Record<string, { slot: string }>;

    // Slots should be consistent (email is at index 0)
    expect(rollbackMapping.email.slot).toBe("fieldString0");
    expect(rollbackMapping.field1.slot).toBe("fieldString1");
    expect(rollbackMapping.field2.slot).toBe("fieldString2");
    // field3 should still be in root mapping even though v2 doesn't have it
    const rootAfterRollback = await prisma.form.findUnique({ where: { id: rootForm.id } });
    const rootMapping = rootAfterRollback?.fieldMapping as Record<string, { slot: string }>;
    expect(rootMapping.field3.slot).toBe("fieldString3");

    // Roll-forward to v3
    await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) }
    );

    const afterRollForward = await prisma.form.findUnique({ where: { id: version3.id } });
    const rollForwardMapping = afterRollForward?.fieldMapping as Record<string, { slot: string }>;

    // All slots should remain consistent
    expect(rollForwardMapping.email.slot).toBe("fieldString0");
    expect(rollForwardMapping.field1.slot).toBe("fieldString1");
    expect(rollForwardMapping.field2.slot).toBe("fieldString2");
    expect(rollForwardMapping.field3.slot).toBe("fieldString3");
  });
});
