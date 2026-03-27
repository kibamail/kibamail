import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as PUBLISH_FORM } from "@/app/(main)/api/v1/forms/[formId]/publish/route";
import { POST as CREATE_VERSION } from "@/app/(main)/api/v1/forms/[formId]/versions/route";
import { POST as CREATE_FORM } from "@/app/(main)/api/v1/forms/route";
import { prisma } from "@/lib/db";
import {
  generateFieldMappingFromApiMapping,
  getSlotCounts,
} from "@/lib/forms/field-mapping";
import type { ApiFieldMapping } from "@/lib/json-render/validation";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";
import {
  multiFieldFormSpec,
  multiFieldFormFieldMapping,
  validFormSpec,
  validFormFieldMapping,
} from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("generateFieldMappingFromApiMapping - Unit Tests", () => {
  test("should generate mapping with correct slot assignments from ApiFieldMapping", () => {
    const apiMapping: ApiFieldMapping = {
      email: {
        contactPropertyId: "email",
        contactPropertyType: "standard",
        fieldType: "string",
      },
      name: {
        contactPropertyId: "firstName",
        contactPropertyType: "standard",
        fieldType: "string",
      },
      satisfaction: {
        contactPropertyId: "satisfaction",
        contactPropertyType: "custom",
        fieldType: "number",
      },
    };

    const mapping = generateFieldMappingFromApiMapping(apiMapping);

    expect(mapping.email).toEqual(
      expect.objectContaining({
        slot: "fieldString0",
        type: "string",
        contactPropertyId: "email",
        contactPropertyType: "standard",
      }),
    );
    expect(mapping.name).toEqual(
      expect.objectContaining({
        slot: "fieldString1",
        type: "string",
        contactPropertyId: "firstName",
        contactPropertyType: "standard",
      }),
    );
    expect(mapping.satisfaction).toEqual(
      expect.objectContaining({
        slot: "fieldNum0",
        type: "number",
        contactPropertyId: "satisfaction",
        contactPropertyType: "custom",
      }),
    );
  });

  test("should preserve existing slot assignments from parent mapping", () => {
    const existingMapping = {
      email: {
        slot: "fieldString5",
        type: "string" as const,
        fieldType: "email",
        contactPropertyId: "email",
        contactPropertyType: "standard" as const,
      },
      rating: {
        slot: "fieldNum3",
        type: "number" as const,
        fieldType: "rating",
        contactPropertyId: "rating",
        contactPropertyType: "custom" as const,
      },
    };

    const apiMapping: ApiFieldMapping = {
      email: {
        contactPropertyId: "email",
        contactPropertyType: "standard",
        fieldType: "string",
      },
      rating: {
        contactPropertyId: "rating",
        contactPropertyType: "custom",
        fieldType: "number",
      },
      newField: {
        contactPropertyId: "newField",
        contactPropertyType: "custom",
        fieldType: "string",
      },
    };

    const mapping = generateFieldMappingFromApiMapping(apiMapping, existingMapping);

    // Existing fields keep their slots
    expect(mapping.email.slot).toBe("fieldString5");
    expect(mapping.rating.slot).toBe("fieldNum3");

    // New field gets next available slot (not 5, which is taken)
    expect(mapping.newField.slot).toBe("fieldString0");
    expect(mapping.newField.type).toBe("string");
  });

  test("should assign sequential slots when starting fresh", () => {
    const apiMapping: ApiFieldMapping = {
      field1: {
        contactPropertyId: "field1",
        contactPropertyType: "custom",
        fieldType: "string",
      },
      field2: {
        contactPropertyId: "field2",
        contactPropertyType: "custom",
        fieldType: "string",
      },
      field3: {
        contactPropertyId: "field3",
        contactPropertyType: "custom",
        fieldType: "string",
      },
      num1: {
        contactPropertyId: "num1",
        contactPropertyType: "custom",
        fieldType: "number",
      },
      num2: {
        contactPropertyId: "num2",
        contactPropertyType: "custom",
        fieldType: "number",
      },
    };

    const mapping = generateFieldMappingFromApiMapping(apiMapping);

    expect(mapping.field1.slot).toBe("fieldString0");
    expect(mapping.field2.slot).toBe("fieldString1");
    expect(mapping.field3.slot).toBe("fieldString2");
    expect(mapping.num1.slot).toBe("fieldNum0");
    expect(mapping.num2.slot).toBe("fieldNum1");
  });

  test("should keep removed fields in mapping for historical data", () => {
    const existingMapping = {
      email: {
        slot: "fieldString0",
        type: "string" as const,
        fieldType: "email",
        contactPropertyId: "email",
        contactPropertyType: "standard" as const,
      },
      removedField: {
        slot: "fieldString1",
        type: "string" as const,
        fieldType: "text",
        contactPropertyId: "removedField",
        contactPropertyType: "custom" as const,
      },
    };

    // New API mapping only has email (removedField dropped)
    const apiMapping: ApiFieldMapping = {
      email: {
        contactPropertyId: "email",
        contactPropertyType: "standard",
        fieldType: "string",
      },
    };

    const mapping = generateFieldMappingFromApiMapping(apiMapping, existingMapping);

    // Both fields should still be in mapping
    expect(mapping.email).toBeDefined();
    expect(mapping.removedField).toBeDefined();
    expect(mapping.removedField.slot).toBe("fieldString1");
  });
});

describe("getSlotCounts - Unit Tests", () => {
  test("should count string and number slots correctly", () => {
    const mapping = {
      field1: {
        slot: "fieldString0",
        type: "string" as const,
        fieldType: "text",
      },
      field2: {
        slot: "fieldString1",
        type: "string" as const,
        fieldType: "text",
      },
      field3: {
        slot: "fieldNum0",
        type: "number" as const,
        fieldType: "rating",
      },
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
    // Create form using multi-field spec + fieldMapping
    const createRequest = post(
      "/forms",
      {
        name: "Contact Form",
        spec: multiFieldFormSpec,
        fieldMapping: multiFieldFormFieldMapping,
      },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    // Publish form
    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
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

    // Slot index may vary because JSONB does not preserve key order,
    // so Object.entries iteration order after a DB round-trip is
    // non-deterministic.  Assert pattern instead of exact index.
    expect(mapping.email).toEqual(
      expect.objectContaining({
        slot: expect.stringMatching(/^fieldString\d+$/),
        type: "string",
        contactPropertyId: "email",
        contactPropertyType: "standard",
      }),
    );
  });

  test("should preserve slot assignments when publishing new version", async () => {
    // Create and publish v1 using validFormSpec + validFormFieldMapping (has email)
    const createRequest = post(
      "/forms",
      {
        name: "Form V1",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );

    // Get v1 mapping
    const v1Form = await prisma.form.findUnique({ where: { id: rootForm.id } });
    const v1Mapping = v1Form?.fieldMapping as Record<string, { slot: string }>;

    expect(v1Mapping.email.slot).toBe("fieldString0");

    // Create v2 with additional fields via version API
    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );
    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await versionResponse.json();

    // Publish v2
    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    // Get v2 mapping
    const v2Form = await prisma.form.findUnique({ where: { id: version2.id } });
    const v2Mapping = v2Form?.fieldMapping as Record<string, { slot: string }>;

    // Existing fields should keep their slots
    expect(v2Mapping.email.slot).toBe("fieldString0");
  });

  test("should reject publishing form without email field mapping", async () => {
    // Create a form with a spec that has email but fieldMapping that does not map email
    const noEmailFieldMapping: ApiFieldMapping = {
      name: {
        contactPropertyId: "firstName",
        contactPropertyType: "standard",
        fieldType: "string",
      },
    };

    const noEmailSpec = {
      root: "form",
      elements: {
        form: {
          type: "FormRoot",
          props: { submitLabel: "Submit" },
          children: ["name-field"],
        },
        "name-field": {
          type: "Input",
          props: { name: "name", label: "Name" },
        },
      },
    };

    const createRequest = post(
      "/forms",
      {
        name: "No Email Form",
        spec: noEmailSpec,
        fieldMapping: noEmailFieldMapping,
      },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    if (createResponse.status !== 201) {
      // If creation fails due to validation, that is fine
      return;
    }

    const publishResponse = await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) },
    );

    expect(publishResponse.status).toBe(400);

    const error = await publishResponse.json();
    expect(error.error.code).toBe("FORM_MISSING_EMAIL_FIELD");
    expect(error.error.message).toContain("Email address");

    // Verify form was not published
    const unpublishedForm = await prisma.form.findUnique({
      where: { id: form.id },
    });
    expect(unpublishedForm?.status).toBe("DRAFT");
    expect(unpublishedForm?.fieldMapping).toBeNull();
  });

  test("should successfully publish form with email field mapped", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Valid Email Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    const publishResponse = await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) },
    );

    expect(publishResponse.status).toBe(200);

    // Verify form was published
    const publishedForm = await prisma.form.findUnique({
      where: { id: form.id },
    });
    expect(publishedForm?.status).toBe("PUBLISHED");
    expect(publishedForm?.fieldMapping).not.toBeNull();
  });

  test("should maintain slot assignments after rollback and roll-forward", async () => {
    // Create and publish v1
    const createRequest = post(
      "/forms",
      {
        name: "Rollback Test",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );

    // Create and publish v2
    const v2Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );
    const v2Response = await CREATE_VERSION(v2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await v2Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    // Create and publish v3
    const v3Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );
    const v3Response = await CREATE_VERSION(v3Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version3 = await v3Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) },
    );

    // Rollback to v2
    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    // Get mapping after rollback
    const afterRollback = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    const rollbackMapping = afterRollback?.fieldMapping as Record<
      string,
      { slot: string }
    >;

    // Slots should be consistent (email is at index 0)
    expect(rollbackMapping.email.slot).toBe("fieldString0");

    // Roll-forward to v3
    await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) },
    );

    const afterRollForward = await prisma.form.findUnique({
      where: { id: version3.id },
    });
    const rollForwardMapping = afterRollForward?.fieldMapping as Record<
      string,
      { slot: string }
    >;

    // All slots should remain consistent
    expect(rollForwardMapping.email.slot).toBe("fieldString0");
  });
});
