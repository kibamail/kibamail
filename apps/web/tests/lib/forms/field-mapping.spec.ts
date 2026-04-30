/**
 * Tests for the form field-mapping slot allocator at lib/forms/field-mapping.ts.
 *
 * Slot assignments are *permanent per root form* — once a field is bound to
 * fieldString7 it must keep that slot across versions, otherwise historical
 * submissions would silently start lining up against the wrong contact
 * property. The allocator is the only thing that guarantees this, so we test:
 *
 *  - Stability: existing slots are preserved when new fields are added.
 *  - Capacity: the 40 string / 15 number caps trigger explicit errors.
 *  - Hole-filling: when fields are removed and re-added, freed slots are
 *    reused before extending into the next available index (matters because
 *    the loop scans 0..N for the first unused slot).
 *  - Type routing: numeric vs string fieldType picks the right pool.
 */

import { describe, expect, test } from "vitest";
import type { ApiFieldMapping } from "@/lib/forms/html-validation";
import {
  type FormFieldMapping,
  generateFieldMappingFromApiMapping,
  getSlotCounts,
  transformToContactData,
} from "@/lib/forms/field-mapping";

function entry(
  fieldType: "string" | "number",
  contactPropertyId: string,
  contactPropertyType: "standard" | "custom" = "standard",
) {
  return { fieldType, contactPropertyId, contactPropertyType };
}

describe("generateFieldMappingFromApiMapping — initial allocation", () => {
  test("assigns sequential string slots starting at 0", () => {
    const apiMapping: ApiFieldMapping = {
      email: entry("string", "email"),
      firstName: entry("string", "firstName"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping);
    expect(result.email.slot).toBe("fieldString0");
    expect(result.firstName.slot).toBe("fieldString1");
    expect(result.email.type).toBe("string");
  });

  test("assigns sequential number slots starting at 0 (independent pool)", () => {
    const apiMapping: ApiFieldMapping = {
      age: entry("number", "age", "custom"),
      score: entry("number", "score", "custom"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping);
    expect(result.age.slot).toBe("fieldNum0");
    expect(result.score.slot).toBe("fieldNum1");
    expect(result.age.type).toBe("number");
  });

  test("string and number fields share neither pool", () => {
    const apiMapping: ApiFieldMapping = {
      email: entry("string", "email"),
      age: entry("number", "age", "custom"),
      firstName: entry("string", "firstName"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping);
    // No collision across slot namespaces — both should start at 0.
    expect(result.email.slot).toBe("fieldString0");
    expect(result.age.slot).toBe("fieldNum0");
    expect(result.firstName.slot).toBe("fieldString1");
  });

  test("preserves contactPropertyId and contactPropertyType on each entry", () => {
    const apiMapping: ApiFieldMapping = {
      company: entry("string", "company_name", "custom"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping);
    expect(result.company).toMatchObject({
      contactPropertyId: "company_name",
      contactPropertyType: "custom",
      fieldType: "string",
    });
  });
});

describe("generateFieldMappingFromApiMapping — versioning (existing mapping)", () => {
  test("keeps existing slot when same field appears in new mapping", () => {
    const existing: FormFieldMapping = {
      email: {
        slot: "fieldString5",
        type: "string",
        fieldType: "string",
        contactPropertyId: "email",
        contactPropertyType: "standard",
      },
    };
    const apiMapping: ApiFieldMapping = {
      email: entry("string", "email"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping, existing);
    // Same field => stable slot, even if it's "out of order".
    expect(result.email.slot).toBe("fieldString5");
  });

  test("reuses freed (lower-index) slot for a new field", () => {
    // Pre-existing form had slot 0 and slot 2 in use. If a new field
    // arrives, it must take slot 1 (the first hole) before slot 3.
    // Otherwise repeated add/remove cycles would exhaust slots prematurely.
    const existing: FormFieldMapping = {
      email: {
        slot: "fieldString0",
        type: "string",
        fieldType: "string",
        contactPropertyId: "email",
        contactPropertyType: "standard",
      },
      lastName: {
        slot: "fieldString2",
        type: "string",
        fieldType: "string",
        contactPropertyId: "lastName",
        contactPropertyType: "standard",
      },
    };
    const apiMapping: ApiFieldMapping = {
      // Note: `email` and `lastName` aren't in the new submission — they're
      // preserved by the spread of `existingSlotMapping` only.
      newField: entry("string", "phone"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping, existing);
    expect(result.newField.slot).toBe("fieldString1");
    // Existing fields are preserved verbatim.
    expect(result.email.slot).toBe("fieldString0");
    expect(result.lastName.slot).toBe("fieldString2");
  });

  test("updates contactProperty info on existing field without changing slot", () => {
    const existing: FormFieldMapping = {
      email: {
        slot: "fieldString3",
        type: "string",
        fieldType: "string",
        contactPropertyId: "old_email_prop",
        contactPropertyType: "custom",
      },
    };
    const apiMapping: ApiFieldMapping = {
      email: entry("string", "email", "standard"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping, existing);
    expect(result.email.slot).toBe("fieldString3"); // unchanged
    expect(result.email.contactPropertyId).toBe("email"); // updated
    expect(result.email.contactPropertyType).toBe("standard"); // updated
  });

  test("new field with type=number routes to numeric pool independently of string slot pressure", () => {
    const existing: FormFieldMapping = {
      // 39 string slots already used (0..38)
      ...Object.fromEntries(
        Array.from({ length: 39 }, (_, i) => [
          `field${i}`,
          {
            slot: `fieldString${i}`,
            type: "string" as const,
            fieldType: "string",
            contactPropertyId: `prop_${i}`,
            contactPropertyType: "standard" as const,
          },
        ]),
      ),
    };
    const apiMapping: ApiFieldMapping = {
      age: entry("number", "age", "custom"),
    };
    const result = generateFieldMappingFromApiMapping(apiMapping, existing);
    expect(result.age.slot).toBe("fieldNum0");
  });
});

describe("generateFieldMappingFromApiMapping — capacity limits", () => {
  test("throws when 41st string field is added", () => {
    // Fill all 40 string slots in existing mapping.
    const existing: FormFieldMapping = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [
        `f${i}`,
        {
          slot: `fieldString${i}`,
          type: "string" as const,
          fieldType: "string",
          contactPropertyId: `p${i}`,
          contactPropertyType: "standard" as const,
        },
      ]),
    );
    const apiMapping: ApiFieldMapping = {
      one_too_many: entry("string", "phone"),
    };
    expect(() =>
      generateFieldMappingFromApiMapping(apiMapping, existing),
    ).toThrow(/Maximum string field slots \(40\) exceeded/);
  });

  test("throws when 16th numeric field is added", () => {
    const existing: FormFieldMapping = Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [
        `n${i}`,
        {
          slot: `fieldNum${i}`,
          type: "number" as const,
          fieldType: "number",
          contactPropertyId: `np${i}`,
          contactPropertyType: "custom" as const,
        },
      ]),
    );
    const apiMapping: ApiFieldMapping = {
      overflow: entry("number", "overflow", "custom"),
    };
    expect(() =>
      generateFieldMappingFromApiMapping(apiMapping, existing),
    ).toThrow(/Maximum numeric field slots \(15\) exceeded/);
  });

  test("can fill exactly 40 string slots without throwing", () => {
    const apiMapping: ApiFieldMapping = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [
        `f${i}`,
        entry("string", `prop_${i}`),
      ]),
    );
    const result = generateFieldMappingFromApiMapping(apiMapping);
    expect(Object.keys(result)).toHaveLength(40);
    expect(result.f0.slot).toBe("fieldString0");
    expect(result.f39.slot).toBe("fieldString39");
  });
});

describe("transformToContactData", () => {
  test("rekeys submission data by contactPropertyId", () => {
    const fieldMapping: FormFieldMapping = {
      "email-address": {
        slot: "fieldString0",
        type: "string",
        fieldType: "string",
        contactPropertyId: "email",
        contactPropertyType: "standard",
      },
      first_name_input: {
        slot: "fieldString1",
        type: "string",
        fieldType: "string",
        contactPropertyId: "firstName",
        contactPropertyType: "standard",
      },
    };
    const result = transformToContactData(
      { "email-address": "user@x.com", first_name_input: "Ada" },
      fieldMapping,
    );
    expect(result).toEqual({ email: "user@x.com", firstName: "Ada" });
  });

  test("drops fields that have no mapping", () => {
    const fieldMapping: FormFieldMapping = {
      known: {
        slot: "fieldString0",
        type: "string",
        fieldType: "string",
        contactPropertyId: "email",
        contactPropertyType: "standard",
      },
    };
    const result = transformToContactData(
      { known: "a@b.c", unknown_field: "ignored" },
      fieldMapping,
    );
    expect(result).toEqual({ email: "a@b.c" });
    expect(result).not.toHaveProperty("unknown_field");
  });

  test("drops fields whose mapping has no contactPropertyId (control inputs)", () => {
    const fieldMapping: FormFieldMapping = {
      consent_box: {
        slot: "fieldString0",
        type: "string",
        fieldType: "string",
        // No contactPropertyId — e.g., a checkbox not bound to a property.
      },
    };
    const result = transformToContactData(
      { consent_box: "on" },
      fieldMapping,
    );
    expect(result).toEqual({});
  });

  test("preserves falsy values (empty string, 0, false) when mapped", () => {
    // Regression guard: a naive `if (!value)` filter would drop these.
    const fieldMapping: FormFieldMapping = {
      age: {
        slot: "fieldNum0",
        type: "number",
        fieldType: "number",
        contactPropertyId: "age",
        contactPropertyType: "custom",
      },
      bio: {
        slot: "fieldString0",
        type: "string",
        fieldType: "string",
        contactPropertyId: "bio",
        contactPropertyType: "custom",
      },
      newsletter: {
        slot: "fieldString1",
        type: "string",
        fieldType: "string",
        contactPropertyId: "newsletter",
        contactPropertyType: "custom",
      },
    };
    const result = transformToContactData(
      { age: 0, bio: "", newsletter: false },
      fieldMapping,
    );
    expect(result).toEqual({ age: 0, bio: "", newsletter: false });
  });
});

describe("getSlotCounts", () => {
  test("counts string and number slots independently and reports caps", () => {
    const mapping: FormFieldMapping = {
      a: {
        slot: "fieldString0",
        type: "string",
        fieldType: "string",
        contactPropertyId: "email",
        contactPropertyType: "standard",
      },
      b: {
        slot: "fieldString1",
        type: "string",
        fieldType: "string",
        contactPropertyId: "firstName",
        contactPropertyType: "standard",
      },
      c: {
        slot: "fieldNum0",
        type: "number",
        fieldType: "number",
        contactPropertyId: "age",
        contactPropertyType: "custom",
      },
    };
    expect(getSlotCounts(mapping)).toEqual({
      stringSlots: 2,
      numSlots: 1,
      maxStringSlots: 40,
      maxNumSlots: 15,
    });
  });

  test("returns zeros for an empty mapping", () => {
    expect(getSlotCounts({})).toEqual({
      stringSlots: 0,
      numSlots: 0,
      maxStringSlots: 40,
      maxNumSlots: 15,
    });
  });
});
