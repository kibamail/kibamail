import type { ContactProperty } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { ContactDataExtractor } from "@/lib/contact-imports/extractor";
import type { ColumnMapping } from "@/lib/contact-imports/types";
import type { ParsedRow } from "@/lib/csv";

function makeRow(data: Record<string, string>): ParsedRow {
  return {
    index: 0,
    lineNumber: 1,
    values: Object.values(data),
    data,
    isValid: true,
  };
}

function makeProperty(
  id: string,
  slot: string,
  overrides: Partial<ContactProperty> = {},
): ContactProperty {
  return {
    id,
    slot,
    name: id,
    workspaceId: "ws_1",
    type: slot.startsWith("propertyFloat") ? "FLOAT" : "STRING",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ContactProperty;
}

describe("ContactDataExtractor", () => {
  describe("email handling", () => {
    test("extracts and normalizes a valid email", () => {
      const mapping: ColumnMapping = { Email: "email" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(makeRow({ Email: "  Foo@Example.COM " }));

      expect(result.email).toBe("foo@example.com");
      expect(result.errors).toEqual([]);
    });

    test("records error for invalid email and leaves email null", () => {
      const mapping: ColumnMapping = { Email: "email" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(makeRow({ Email: "not-an-email" }));

      expect(result.email).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Invalid email");
      expect(result.errors[0]).toContain("not-an-email");
    });

    test("skips empty email cell without erroring", () => {
      const mapping: ColumnMapping = { Email: "email", First: "firstName" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(makeRow({ Email: "", First: "Alice" }));

      expect(result.email).toBeNull();
      expect(result.errors).toEqual([]);
      expect(result.standardFields.firstName).toBe("Alice");
    });
  });

  describe("standard field normalization", () => {
    test("passes through firstName/lastName values unchanged", () => {
      const mapping: ColumnMapping = {
        First: "firstName",
        Last: "lastName",
      };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(
        makeRow({ First: "Ada", Last: "Lovelace" }),
      );

      expect(result.standardFields.firstName).toBe("Ada");
      expect(result.standardFields.lastName).toBe("Lovelace");
    });

    test("normalizes country codes to ISO alpha-2", () => {
      const mapping: ColumnMapping = { Country: "country" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(
        makeRow({ Country: "United States" }),
      );

      expect(result.standardFields.country).toBe("US");
    });

    test("skips invalid country values silently", () => {
      const mapping: ColumnMapping = { Country: "country" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(
        makeRow({ Country: "Atlantis" }),
      );

      expect(result.standardFields.country).toBeUndefined();
      expect(result.errors).toEqual([]);
    });

    test("normalizes phone numbers using country hint from same row", () => {
      const mapping: ColumnMapping = {
        Phone: "phone",
        Country: "country",
      };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(
        makeRow({ Phone: "415 555 2671", Country: "United States" }),
      );

      expect(result.standardFields.phone).toBe("+14155552671");
      expect(result.standardFields.country).toBe("US");
    });

    test("skips invalid phone numbers without erroring", () => {
      const mapping: ColumnMapping = { Phone: "phone" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(
        makeRow({ Phone: "not-a-phone" }),
      );

      expect(result.standardFields.phone).toBeUndefined();
      expect(result.errors).toEqual([]);
    });

    test("normalizes timezone aliases to IANA names", () => {
      const mapping: ColumnMapping = { TZ: "timezone" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(makeRow({ TZ: "America/New_York" }));

      expect(result.standardFields.timezone).toBe("America/New_York");
    });

    test("skips empty cell values without invoking normalizers", () => {
      const mapping: ColumnMapping = { Phone: "phone", City: "city" };
      const extractor = new ContactDataExtractor(mapping, []);

      const result = extractor.extract(makeRow({ Phone: "", City: "" }));

      expect(result.standardFields).toEqual({});
      expect(result.errors).toEqual([]);
    });
  });

  describe("custom properties", () => {
    test("maps mapped property ids to their slot", () => {
      const property = makeProperty("prop_age", "propertyFloat1");
      const extractor = new ContactDataExtractor(
        { Age: "prop_age" },
        [property],
      );

      const result = extractor.extract(makeRow({ Age: "42" }));

      expect(result.customProperties.propertyFloat1).toBe("42");
      expect(result.standardFields).toEqual({});
      expect(result.email).toBeNull();
    });

    test("ignores values for unknown custom property ids", () => {
      const extractor = new ContactDataExtractor(
        { Foo: "prop_unknown" },
        [makeProperty("prop_age", "propertyFloat1")],
      );

      const result = extractor.extract(makeRow({ Foo: "value" }));

      expect(result.customProperties).toEqual({});
      expect(result.errors).toEqual([]);
    });
  });

  describe("combined extraction", () => {
    test("extracts a full row across all field categories", () => {
      const property = makeProperty("prop_company", "propertyString1");
      const extractor = new ContactDataExtractor(
        {
          Email: "email",
          First: "firstName",
          Country: "country",
          Phone: "phone",
          Company: "prop_company",
        },
        [property],
      );

      const result = extractor.extract(
        makeRow({
          Email: "ada@example.com",
          First: "Ada",
          Country: "GB",
          Phone: "020 7946 0958",
          Company: "Analytical Engine Co",
        }),
      );

      expect(result.email).toBe("ada@example.com");
      expect(result.standardFields.firstName).toBe("Ada");
      expect(result.standardFields.country).toBe("GB");
      expect(result.standardFields.phone).toBe("+442079460958");
      expect(result.customProperties.propertyString1).toBe(
        "Analytical Engine Co",
      );
      expect(result.errors).toEqual([]);
    });

    test("country hint pre-pass uses the country column even when iterated later", () => {
      // Place phone before country in the mapping to confirm pre-pass works
      const extractor = new ContactDataExtractor(
        { Phone: "phone", Country: "country" },
        [],
      );

      const result = extractor.extract(
        makeRow({ Phone: "020 7946 0958", Country: "GB" }),
      );

      expect(result.standardFields.phone).toBe("+442079460958");
    });
  });
});
