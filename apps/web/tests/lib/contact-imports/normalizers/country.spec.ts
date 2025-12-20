import { describe, expect, test } from "vitest";
import {
  normalizeCountry,
  isValidCountryCode,
} from "@/lib/contact-imports/normalizers/country";

describe("normalizeCountry", () => {
  test("returns alpha-2 code as-is", () => {
    expect(normalizeCountry("US")).toEqual({ success: true, value: "US" });
    expect(normalizeCountry("GB")).toEqual({ success: true, value: "GB" });
    expect(normalizeCountry("DE")).toEqual({ success: true, value: "DE" });
  });

  test("handles lowercase alpha-2 codes", () => {
    expect(normalizeCountry("us")).toEqual({ success: true, value: "US" });
    expect(normalizeCountry("gb")).toEqual({ success: true, value: "GB" });
  });

  test("converts alpha-3 to alpha-2", () => {
    expect(normalizeCountry("USA")).toEqual({ success: true, value: "US" });
    expect(normalizeCountry("GBR")).toEqual({ success: true, value: "GB" });
    expect(normalizeCountry("DEU")).toEqual({ success: true, value: "DE" });
  });

  test("converts English country names", () => {
    expect(normalizeCountry("United States")).toEqual({
      success: true,
      value: "US",
    });
    expect(normalizeCountry("United Kingdom")).toEqual({
      success: true,
      value: "GB",
    });
    expect(normalizeCountry("Germany")).toEqual({ success: true, value: "DE" });
    expect(normalizeCountry("France")).toEqual({ success: true, value: "FR" });
  });

  test("converts German country names", () => {
    expect(normalizeCountry("Deutschland")).toEqual({
      success: true,
      value: "DE",
    });
    expect(normalizeCountry("Frankreich")).toEqual({
      success: true,
      value: "FR",
    });
  });

  test("converts French country names", () => {
    expect(normalizeCountry("Allemagne")).toEqual({
      success: true,
      value: "DE",
    });
    expect(normalizeCountry("France")).toEqual({
      success: true,
      value: "FR",
    });
  });

  test("converts Spanish country names", () => {
    expect(normalizeCountry("Estados Unidos")).toEqual({
      success: true,
      value: "US",
    });
    expect(normalizeCountry("Alemania")).toEqual({
      success: true,
      value: "DE",
    });
  });

  test("handles case insensitive country names", () => {
    expect(normalizeCountry("united states")).toEqual({
      success: true,
      value: "US",
    });
    expect(normalizeCountry("GERMANY")).toEqual({ success: true, value: "DE" });
  });

  test("trims whitespace", () => {
    expect(normalizeCountry("  US  ")).toEqual({ success: true, value: "US" });
    expect(normalizeCountry("  Germany  ")).toEqual({
      success: true,
      value: "DE",
    });
  });

  test("fails for empty string", () => {
    const result = normalizeCountry("");
    expect(result.success).toBe(false);
  });

  test("fails for whitespace only", () => {
    const result = normalizeCountry("   ");
    expect(result.success).toBe(false);
  });

  test("fails for unrecognized country", () => {
    const result = normalizeCountry("Narnia");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("reason");
  });

  test("fails for random text", () => {
    const result = normalizeCountry("not a country");
    expect(result.success).toBe(false);
  });
});

describe("isValidCountryCode", () => {
  test("returns true for valid alpha-2 codes", () => {
    expect(isValidCountryCode("US")).toBe(true);
    expect(isValidCountryCode("GB")).toBe(true);
  });

  test("returns true for valid alpha-3 codes", () => {
    expect(isValidCountryCode("USA")).toBe(true);
    expect(isValidCountryCode("GBR")).toBe(true);
  });

  test("returns false for invalid codes", () => {
    expect(isValidCountryCode("XX")).toBe(false);
    expect(isValidCountryCode("XXX")).toBe(false);
  });
});
