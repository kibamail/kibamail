import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as PUBLISH_FORM } from "@/app/(main)/api/v1/forms/[formId]/publish/route";
import { POST as CREATE_VERSION } from "@/app/(main)/api/v1/forms/[formId]/versions/route";
import { POST as CREATE_FORM } from "@/app/(main)/api/v1/forms/route";
import { prisma } from "@/lib/db";
import {
  extractFieldsFromSchema,
  generateFieldMapping,
  getSlotCounts,
  getStorageType,
} from "@/lib/forms/field-mapping";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";
import {
  allFieldTypesFormSchema,
  DEFAULT_FIELD_APPEARANCE,
  emptyFormSchema,
  formWithoutEmailField,
  multiFieldFormSchema,
  validFormFields,
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

describe("extractFieldsFromSchema - Unit Tests", () => {
  test("should extract fields from paged schema with sections", () => {
    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "text", name: "firstName", label: "First Name" },
                { type: "text", name: "lastName", label: "Last Name" },
              ],
            },
          ],
        },
        {
          id: "page_2",
          sections: [
            {
              id: "section_2",
              fields: [{ type: "email", name: "email", label: "Email" }],
            },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(3);
    expect(fields[0]).toEqual({
      name: "firstName",
      type: "text",
      label: "First Name",
    });
    expect(fields[1]).toEqual({
      name: "lastName",
      type: "text",
      label: "Last Name",
    });
    expect(fields[2]).toEqual({ name: "email", type: "email", label: "Email" });
  });

  test("should extract fields from multiple sections in a page", () => {
    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [{ type: "text", name: "name", label: "Name" }],
            },
            {
              id: "section_2",
              fields: [{ type: "select", name: "country", label: "Country" }],
            },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe("name");
    expect(fields[1].name).toBe("country");
  });

  test("should skip presentation fields like content", () => {
    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "content", name: "intro", label: "Introduction" },
                { type: "text", name: "validField", label: "Valid Field" },
              ],
            },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("validField");
  });

  test("should skip fields without name", () => {
    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "text", label: "No Name Field" }, // No name
                { type: "text", name: "validField", label: "Valid Field" },
              ],
            },
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

  test("should extract all supported field types", () => {
    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "text", name: "textField", label: "Text" },
                { type: "email", name: "emailField", label: "Email" },
                { type: "number", name: "numberField", label: "Number" },
                { type: "phone", name: "phoneField", label: "Phone" },
                { type: "url", name: "urlField", label: "URL" },
                { type: "textarea", name: "textareaField", label: "Textarea" },
                { type: "select", name: "selectField", label: "Select" },
                { type: "rating", name: "ratingField", label: "Rating" },
                { type: "slider", name: "sliderField", label: "Slider" },
                { type: "date", name: "dateField", label: "Date" },
                { type: "checkbox", name: "checkboxField", label: "Checkbox" },
              ],
            },
          ],
        },
      ],
    };

    const fields = extractFieldsFromSchema(schema);

    expect(fields).toHaveLength(11);
    expect(fields.map((f) => f.type)).toEqual([
      "text",
      "email",
      "number",
      "phone",
      "url",
      "textarea",
      "select",
      "rating",
      "slider",
      "date",
      "checkbox",
    ]);
  });
});

describe("getStorageType - Unit Tests", () => {
  test("should return 'number' for numeric field types", () => {
    expect(getStorageType("number")).toBe("number");
    expect(getStorageType("rating")).toBe("number");
    expect(getStorageType("slider")).toBe("number");
  });

  test("should return 'string' for all other field types", () => {
    expect(getStorageType("text")).toBe("string");
    expect(getStorageType("email")).toBe("string");
    expect(getStorageType("phone")).toBe("string");
    expect(getStorageType("url")).toBe("string");
    expect(getStorageType("textarea")).toBe("string");
    expect(getStorageType("select")).toBe("string");
    expect(getStorageType("checkbox")).toBe("string");
    expect(getStorageType("date")).toBe("string");
    expect(getStorageType("file")).toBe("string");
  });
});

describe("generateFieldMapping - Unit Tests", () => {
  test("should generate mapping with correct slot assignments", () => {
    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "email", name: "email", label: "Email Address" },
                { type: "text", name: "name" },
                { type: "rating", name: "satisfaction" },
              ],
            },
          ],
        },
      ],
    };

    const mapping = generateFieldMapping(schema, null);

    expect(mapping.email).toEqual({
      slot: "fieldString0",
      type: "string",
      fieldType: "email",
      label: "Email Address",
    });
    expect(mapping.name).toEqual({
      slot: "fieldString1",
      type: "string",
      fieldType: "text",
      label: undefined,
    });
    expect(mapping.satisfaction).toEqual({
      slot: "fieldNum0",
      type: "number",
      fieldType: "rating",
      label: undefined,
    });
  });

  test("should preserve existing slot assignments from parent mapping", () => {
    const existingMapping = {
      email: {
        slot: "fieldString5",
        type: "string" as const,
        fieldType: "email",
      },
      rating: {
        slot: "fieldNum3",
        type: "number" as const,
        fieldType: "rating",
      },
    };

    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "email", name: "email" }, // Existing field
                { type: "rating", name: "rating" }, // Existing field
                { type: "text", name: "newField" }, // New field
              ],
            },
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
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "text", name: "field1" },
                { type: "text", name: "field2" },
                { type: "text", name: "field3" },
                { type: "rating", name: "num1" },
                { type: "rating", name: "num2" },
              ],
            },
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

  test("should update label for existing fields if changed", () => {
    const existingMapping = {
      email: {
        slot: "fieldString0",
        type: "string" as const,
        fieldType: "email",
        label: "Old Label",
      },
    };

    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [{ type: "email", name: "email", label: "New Label" }],
            },
          ],
        },
      ],
    };

    const mapping = generateFieldMapping(schema, existingMapping);

    expect(mapping.email.slot).toBe("fieldString0"); // Slot preserved
    expect(mapping.email.label).toBe("New Label"); // Label updated
  });

  test("should keep removed fields in mapping for historical data", () => {
    const existingMapping = {
      email: {
        slot: "fieldString0",
        type: "string" as const,
        fieldType: "email",
      },
      removedField: {
        slot: "fieldString1",
        type: "string" as const,
        fieldType: "text",
      },
    };

    const schema = {
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                { type: "email", name: "email" }, // Only email remains
              ],
            },
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
    // Create form using multi-field schema
    const createRequest = post(
      "/forms",
      { name: "Contact Form", fields: multiFieldFormSchema },
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

    expect(mapping.email).toEqual({
      slot: "fieldString0",
      type: "string",
      fieldType: "email",
      label: "Email Address",
      contactPropertyId: "email",
      contactPropertyType: "standard",
    });
    expect(mapping.name).toEqual({
      slot: "fieldString1",
      type: "string",
      fieldType: "text",
      label: "Full Name",
      contactPropertyId: "firstName",
      contactPropertyType: "standard",
    });
    expect(mapping.rating).toEqual({
      slot: "fieldNum0",
      type: "number",
      fieldType: "rating",
      label: "How would you rate us?",
      contactPropertyId: "rating",
      contactPropertyType: "custom",
    });
  });

  test("should preserve slot assignments when publishing new version", async () => {
    // Create and publish v1 using validFormFields (has email)
    const createRequest = post(
      "/forms",
      { name: "Form V1", fields: validFormFields },
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

    // Create v2 with additional fields
    const v2Fields = {
      ...validFormFields,
      id: "test_form_v2",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                ...validFormFields.pages[0].sections[0].fields,
                {
                  id: "field_name",
                  type: "text",
                  name: "name",
                  label: "Full Name",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "standard",
                    id: "firstName",
                    name: "First name",
                  },
                },
                {
                  id: "field_phone",
                  type: "phone",
                  name: "phone",
                  label: "Phone",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "standard",
                    id: "phone",
                    name: "Phone",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v2Fields },
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

    // New fields should get next available slots
    expect(v2Mapping.name.slot).toBe("fieldString1");
    expect(v2Mapping.phone.slot).toBe("fieldString2");

    // Root form should also have updated mapping
    const updatedRoot = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    const rootMapping = updatedRoot?.fieldMapping as Record<
      string,
      { slot: string }
    >;

    expect(rootMapping.email.slot).toBe("fieldString0");
    expect(rootMapping.name.slot).toBe("fieldString1");
    expect(rootMapping.phone.slot).toBe("fieldString2");
  });

  test("should handle numeric fields correctly across versions", async () => {
    // Create form with email and rating field
    const v1Fields = {
      ...validFormFields,
      id: "rating_form_v1",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                ...validFormFields.pages[0].sections[0].fields,
                {
                  id: "field_rating1",
                  type: "rating",
                  name: "rating1",
                  label: "Rating 1",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "custom",
                    id: "rating1",
                    name: "Rating 1",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    // Create and publish v1
    const createRequest = post(
      "/forms",
      { name: "Rating Form", fields: v1Fields },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );

    const v1Form = await prisma.form.findUnique({ where: { id: rootForm.id } });
    const v1Mapping = v1Form?.fieldMapping as Record<
      string,
      { slot: string; type: string }
    >;

    expect(v1Mapping.email.slot).toBe("fieldString0");
    expect(v1Mapping.email.type).toBe("string");
    expect(v1Mapping.rating1.slot).toBe("fieldNum0");
    expect(v1Mapping.rating1.type).toBe("number");

    // Create v2 with another rating field
    const v2Fields = {
      ...v1Fields,
      id: "rating_form_v2",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                ...v1Fields.pages[0].sections[0].fields,
                {
                  id: "field_rating2",
                  type: "rating",
                  name: "rating2",
                  label: "Rating 2",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "custom",
                    id: "rating2",
                    name: "Rating 2",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v2Fields },
      fullAccessApiKey.key,
    );
    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await versionResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    const v2Form = await prisma.form.findUnique({ where: { id: version2.id } });
    const v2Mapping = v2Form?.fieldMapping as Record<
      string,
      { slot: string; type: string }
    >;

    expect(v2Mapping.rating1.slot).toBe("fieldNum0");
    expect(v2Mapping.rating2.slot).toBe("fieldNum1");
    expect(v2Mapping.rating2.type).toBe("number");
  });

  test("should handle multiple sections correctly", async () => {
    // Form with multiple sections
    const formFields = {
      ...validFormFields,
      id: "multi_section_form",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_personal",
              fields: [
                {
                  id: "field_firstName",
                  type: "text",
                  name: "firstName",
                  label: "First Name",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "standard",
                    id: "firstName",
                    name: "First name",
                  },
                },
                {
                  id: "field_lastName",
                  type: "text",
                  name: "lastName",
                  label: "Last Name",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "standard",
                    id: "lastName",
                    name: "Last name",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
            {
              id: "section_contact",
              fields: [
                {
                  id: "field_email",
                  type: "email",
                  name: "email",
                  label: "Email",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "standard",
                    id: "email",
                    name: "Email address",
                  },
                },
                {
                  id: "field_phone",
                  type: "phone",
                  name: "phone",
                  label: "Phone",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "standard",
                    id: "phone",
                    name: "Phone",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "Multi-Section Form", fields: formFields },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) },
    );

    const publishedForm = await prisma.form.findUnique({
      where: { id: form.id },
    });
    const mapping = publishedForm?.fieldMapping as Record<
      string,
      { slot: string }
    >;

    // All fields from all sections should be extracted and mapped
    expect(mapping.firstName.slot).toBe("fieldString0");
    expect(mapping.lastName.slot).toBe("fieldString1");
    expect(mapping.email.slot).toBe("fieldString2");
    expect(mapping.phone.slot).toBe("fieldString3");
  });

  test("should reject creating form with no fields", async () => {
    // With strict schema validation, forms with empty fields array fail at creation time
    const createRequest = post(
      "/forms",
      { name: "Empty Form", fields: emptyFormSchema },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    // Form creation should fail with validation error since sections require at least one field
    expect(createResponse.status).toBe(422);
    expect(form.error.code).toBe("VALIDATION_FAILED");
  });

  test("should reject publishing form without email field", async () => {
    const createRequest = post(
      "/forms",
      { name: "No Email Form", fields: formWithoutEmailField },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

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

  test("should reject publishing form with email field that has wrong name", async () => {
    // Create form with email-type field but wrong name
    const wrongEmailNameSchema = {
      ...validFormFields,
      id: "wrong_email_name",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                {
                  id: "field_userEmail",
                  type: "email",
                  name: "userEmail", // Wrong name, should be "email"
                  label: "Email Address",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "custom",
                    id: "userEmail", // Not mapped to standard "email" property
                    name: "User Email",
                  },
                },
                {
                  id: "field_name",
                  type: "text",
                  name: "name",
                  label: "Name",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "standard",
                    id: "firstName",
                    name: "First name",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "Wrong Email Name Form", fields: wrongEmailNameSchema },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    const publishResponse = await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) },
    );

    expect(publishResponse.status).toBe(400);

    const error = await publishResponse.json();
    expect(error.error.code).toBe("FORM_MISSING_EMAIL_FIELD");

    // Verify form was not published
    const unpublishedForm = await prisma.form.findUnique({
      where: { id: form.id },
    });
    expect(unpublishedForm?.status).toBe("DRAFT");
  });

  test("should successfully publish form with email field named 'email'", async () => {
    const createRequest = post(
      "/forms",
      { name: "Valid Email Form", fields: validFormFields },
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

  test("should handle all supported field types", async () => {
    const createRequest = post(
      "/forms",
      { name: "All Types Form", fields: allFieldTypesFormSchema },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const form = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${form.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: form.id }) },
    );

    const publishedForm = await prisma.form.findUnique({
      where: { id: form.id },
    });
    const mapping = publishedForm?.fieldMapping as Record<
      string,
      { slot: string; type: string; fieldType: string }
    >;

    // String types
    expect(mapping.text_field.type).toBe("string");
    expect(mapping.phone_field.type).toBe("string");
    expect(mapping.url_field.type).toBe("string");
    expect(mapping.textarea_field.type).toBe("string");
    expect(mapping.select_field.type).toBe("string");
    expect(mapping.date_field.type).toBe("string");
    expect(mapping.checkbox_field.type).toBe("string");

    // Numeric types
    expect(mapping.number_field.type).toBe("number");
    expect(mapping.rating_field.type).toBe("number");
    expect(mapping.slider_field.type).toBe("number");

    // Verify fieldType is preserved
    expect(mapping.text_field.fieldType).toBe("text");
    expect(mapping.rating_field.fieldType).toBe("rating");
    expect(mapping.email.fieldType).toBe("email");
  });

  test("should maintain slot assignments after rollback and roll-forward", async () => {
    // Create and publish v1
    const v1Fields = {
      ...validFormFields,
      id: "rollback_test_v1",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                ...validFormFields.pages[0].sections[0].fields,
                {
                  id: "field_field1",
                  type: "text",
                  name: "field1",
                  label: "Field 1",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "custom",
                    id: "field1",
                    name: "Field 1",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    const createRequest = post(
      "/forms",
      { name: "Rollback Test", fields: v1Fields },
      fullAccessApiKey.key,
    );
    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );

    // Create and publish v2 with new field
    const v2Fields = {
      ...v1Fields,
      id: "rollback_test_v2",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                ...v1Fields.pages[0].sections[0].fields,
                {
                  id: "field_field2",
                  type: "text",
                  name: "field2",
                  label: "Field 2",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "custom",
                    id: "field2",
                    name: "Field 2",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    const v2Request = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v2Fields },
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

    // Create and publish v3 with another field
    const v3Fields = {
      ...v2Fields,
      id: "rollback_test_v3",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                ...v2Fields.pages[0].sections[0].fields,
                {
                  id: "field_field3",
                  type: "text",
                  name: "field3",
                  label: "Field 3",
                  appearance: DEFAULT_FIELD_APPEARANCE,
                  contactProperty: {
                    type: "custom",
                    id: "field3",
                    name: "Field 3",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    const v3Request = post(
      `/forms/${rootForm.id}/versions`,
      { fields: v3Fields },
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
    expect(rollbackMapping.field1.slot).toBe("fieldString1");
    expect(rollbackMapping.field2.slot).toBe("fieldString2");
    // field3 should still be in root mapping even though v2 doesn't have it
    const rootAfterRollback = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    const rootMapping = rootAfterRollback?.fieldMapping as Record<
      string,
      { slot: string }
    >;
    expect(rootMapping.field3.slot).toBe("fieldString3");

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
    expect(rollForwardMapping.field1.slot).toBe("fieldString1");
    expect(rollForwardMapping.field2.slot).toBe("fieldString2");
    expect(rollForwardMapping.field3.slot).toBe("fieldString3");
  });
});
