import { describe, expect, test } from "vitest";
import {
  extractVariables,
  isValidVariable,
  STANDARD_VARIABLES,
  SAMPLE_VARIABLES,
  KNOWN_VARIABLE_NAMES,
  CUSTOM_PROPERTY_PREFIX,
} from "@/lib/emails/variables";

describe("extractVariables", () => {
  test("extracts a single variable", () => {
    const result = extractVariables("Hello {{firstName}}");
    expect(result).toContain("firstName");
    expect(result).toHaveLength(1);
  });

  test("extracts multiple variables", () => {
    const result = extractVariables(
      "Hello {{firstName}} {{lastName}}, email: {{email}}",
    );
    expect(result).toContain("firstName");
    expect(result).toContain("lastName");
    expect(result).toContain("email");
    expect(result).toHaveLength(3);
  });

  test("extracts dotted variables like contact.email", () => {
    const result = extractVariables("Hello {{contact.email}}");
    expect(result).toContain("contact.email");
    expect(result).toHaveLength(1);
  });

  test("extracts multi-level dotted variables", () => {
    const result = extractVariables("{{contact.first_name}}");
    expect(result).toContain("contact.first_name");
    expect(result).toHaveLength(1);
  });

  test("deduplicates variables", () => {
    const result = extractVariables(
      "{{firstName}} and {{firstName}} again",
    );
    expect(result.filter((v) => v === "firstName")).toHaveLength(1);
  });

  test("returns empty array for text without variables", () => {
    const result = extractVariables("Hello world, no variables here!");
    expect(result).toEqual([]);
  });

  test("returns empty array for empty string", () => {
    expect(extractVariables("")).toEqual([]);
  });

  test("ignores malformed variable syntax", () => {
    const result = extractVariables("Hello {firstName} {{ name }}");
    expect(result).toEqual([]);
  });

  test("extracts compliance variables", () => {
    const result = extractVariables(
      "{{business_address}} {{unsubscribe_url}} {{terms_url}} {{privacy_url}}",
    );
    expect(result).toContain("business_address");
    expect(result).toContain("unsubscribe_url");
    expect(result).toContain("terms_url");
    expect(result).toContain("privacy_url");
    expect(result).toHaveLength(4);
  });

  test("extracts variables from HTML with attributes", () => {
    const html = '<a href="{{unsubscribe_url}}">Unsubscribe</a>';
    const result = extractVariables(html);
    expect(result).toContain("unsubscribe_url");
  });
});

describe("isValidVariable", () => {
  test("returns true for standard variable names", () => {
    expect(isValidVariable("email")).toBe(true);
    expect(isValidVariable("firstName")).toBe(true);
    expect(isValidVariable("unsubscribe_url")).toBe(true);
    expect(isValidVariable("business_address")).toBe(true);
  });

  test("returns true for prefixed standard variables", () => {
    expect(isValidVariable("contact.email")).toBe(true);
    expect(isValidVariable("contact.first_name")).toBe(true);
    expect(isValidVariable("contact.last_name")).toBe(true);
  });

  test("returns true for custom contact properties", () => {
    expect(isValidVariable("contact.company")).toBe(true);
    expect(isValidVariable("contact.job_title")).toBe(true);
    expect(isValidVariable("contact.favorite_color")).toBe(true);
  });

  test("returns false for unknown variables without prefix", () => {
    expect(isValidVariable("unknownVariable")).toBe(false);
    expect(isValidVariable("random_name")).toBe(false);
  });

  test("returns true for all STANDARD_VARIABLES keys", () => {
    for (const key of Object.keys(STANDARD_VARIABLES)) {
      expect(isValidVariable(key)).toBe(true);
    }
  });
});

describe("STANDARD_VARIABLES", () => {
  test("contains all required compliance variables", () => {
    expect(STANDARD_VARIABLES).toHaveProperty("business_address");
    expect(STANDARD_VARIABLES).toHaveProperty("unsubscribe_url");
    expect(STANDARD_VARIABLES).toHaveProperty("terms_url");
    expect(STANDARD_VARIABLES).toHaveProperty("privacy_url");
  });

  test("contains standard contact variables", () => {
    expect(STANDARD_VARIABLES).toHaveProperty("email");
    expect(STANDARD_VARIABLES).toHaveProperty("firstName");
    expect(STANDARD_VARIABLES).toHaveProperty("lastName");
  });
});

describe("SAMPLE_VARIABLES", () => {
  test("has values for keys it defines", () => {
    for (const key of Object.keys(SAMPLE_VARIABLES)) {
      expect(typeof SAMPLE_VARIABLES[key]).toBe("string");
      expect(SAMPLE_VARIABLES[key].length).toBeGreaterThan(0);
    }
  });

  test("includes sample values for compliance variables", () => {
    expect(SAMPLE_VARIABLES).toHaveProperty("business_address");
    expect(SAMPLE_VARIABLES).toHaveProperty("unsubscribe_url");
    expect(SAMPLE_VARIABLES).toHaveProperty("terms_url");
    expect(SAMPLE_VARIABLES).toHaveProperty("privacy_url");
  });

  test("has non-empty string values", () => {
    for (const [key, value] of Object.entries(SAMPLE_VARIABLES)) {
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});

describe("KNOWN_VARIABLE_NAMES", () => {
  test("includes all STANDARD_VARIABLES keys", () => {
    for (const key of Object.keys(STANDARD_VARIABLES)) {
      expect(KNOWN_VARIABLE_NAMES.has(key)).toBe(true);
    }
  });
});

describe("CUSTOM_PROPERTY_PREFIX", () => {
  test("is 'contact.'", () => {
    expect(CUSTOM_PROPERTY_PREFIX).toBe("contact.");
  });
});
