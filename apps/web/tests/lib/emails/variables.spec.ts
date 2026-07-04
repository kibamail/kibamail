import { describe, expect, test } from "vitest";
import {
  STANDARD_VARIABLES,
  SAMPLE_VARIABLES,
  KNOWN_VARIABLE_NAMES,
  CUSTOM_PROPERTY_PREFIX,
  extractVariables,
  isValidVariable,
} from "@/lib/emails/variables";

describe("extractVariables", () => {
  test("extracts a single variable", () => {
    expect(extractVariables("Hello {{firstName}}")).toEqual(["firstName"]);
  });

  test("extracts multiple distinct variables", () => {
    const result = extractVariables("{{firstName}} {{lastName}} {{email}}");
    expect(result).toContain("firstName");
    expect(result).toContain("lastName");
    expect(result).toContain("email");
    expect(result.length).toBe(3);
  });

  test("deduplicates repeated variables", () => {
    const result = extractVariables("{{firstName}} and {{firstName}}");
    expect(result).toEqual(["firstName"]);
  });

  test("extracts dot-notation variables like contact.company_name", () => {
    const result = extractVariables("{{contact.company_name}}");
    expect(result).toEqual(["contact.company_name"]);
  });

  test("extracts nested dot-notation variables", () => {
    const result = extractVariables("{{contact.company.name}}");
    expect(result).toEqual(["contact.company.name"]);
  });

  test("returns empty array for text with no variables", () => {
    expect(extractVariables("No variables here")).toEqual([]);
  });

  test("returns empty array for empty string", () => {
    expect(extractVariables("")).toEqual([]);
  });

  test("extracts variables mixed with regular text", () => {
    const result = extractVariables(
      '<p>Hello {{firstName}}</p><a href="{{unsubscribe_url}}">Unsub</a>',
    );
    expect(result).toContain("firstName");
    expect(result).toContain("unsubscribe_url");
    expect(result.length).toBe(2);
  });
});

describe("isValidVariable", () => {
  test("returns true for standard variable names", () => {
    expect(isValidVariable("firstName")).toBe(true);
    expect(isValidVariable("email")).toBe(true);
    expect(isValidVariable("unsubscribe_url")).toBe(true);
    expect(isValidVariable("business_address")).toBe(true);
  });

  test("returns true for contact.-prefixed standard variables", () => {
    expect(isValidVariable("contact.email")).toBe(true);
    expect(isValidVariable("contact.first_name")).toBe(true);
  });

  test("returns true for custom contact. properties", () => {
    expect(isValidVariable("contact.company_name")).toBe(true);
    expect(isValidVariable("contact.plan")).toBe(true);
  });

  test("returns false for unknown variables without contact. prefix", () => {
    expect(isValidVariable("unknown_thing")).toBe(false);
    expect(isValidVariable("random_var")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isValidVariable("")).toBe(false);
  });
});

describe("STANDARD_VARIABLES", () => {
  test("contains all required compliance variables", () => {
    expect(STANDARD_VARIABLES).toHaveProperty("business_address");
    expect(STANDARD_VARIABLES).toHaveProperty("unsubscribe_url");
    expect(STANDARD_VARIABLES).toHaveProperty("terms_url");
    expect(STANDARD_VARIABLES).toHaveProperty("privacy_url");
  });

  test("descriptions are non-empty strings", () => {
    for (const [key, desc] of Object.entries(STANDARD_VARIABLES)) {
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(0);
    }
  });
});

describe("SAMPLE_VARIABLES", () => {
  test("has sample values for all compliance-critical variables", () => {
    const requiredForCompliance = [
      "business_address",
      "unsubscribe_url",
      "terms_url",
      "privacy_url",
      "firstName",
      "email",
    ];
    for (const key of requiredForCompliance) {
      expect(SAMPLE_VARIABLES).toHaveProperty(key);
      expect(typeof SAMPLE_VARIABLES[key]).toBe("string");
    }
  });

  test("covers a meaningful subset of standard variables", () => {
    const standardKeys = Object.keys(STANDARD_VARIABLES);
    const sampleKeys = Object.keys(SAMPLE_VARIABLES);
    const overlap = sampleKeys.filter((k) => standardKeys.includes(k));
    expect(overlap.length).toBeGreaterThan(standardKeys.length / 2);
  });

  test("sample values are non-empty strings", () => {
    for (const [key, value] of Object.entries(SAMPLE_VARIABLES)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe("KNOWN_VARIABLE_NAMES", () => {
  test("is a Set containing all STANDARD_VARIABLES keys", () => {
    for (const key of Object.keys(STANDARD_VARIABLES)) {
      expect(KNOWN_VARIABLE_NAMES.has(key)).toBe(true);
    }
  });
});

describe("CUSTOM_PROPERTY_PREFIX", () => {
  test('is "contact."', () => {
    expect(CUSTOM_PROPERTY_PREFIX).toBe("contact.");
  });
});
