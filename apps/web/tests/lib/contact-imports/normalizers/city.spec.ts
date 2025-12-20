import { describe, expect, test } from "vitest";
import { normalizeCity } from "@/lib/contact-imports/normalizers/city";

describe("normalizeCity", () => {
  test("converts to title case", () => {
    expect(normalizeCity("new york")).toEqual({
      success: true,
      value: "New York",
    });
    expect(normalizeCity("SAN FRANCISCO")).toEqual({
      success: true,
      value: "San Francisco",
    });
    expect(normalizeCity("los angeles")).toEqual({
      success: true,
      value: "Los Angeles",
    });
  });

  test("handles hyphenated city names", () => {
    expect(normalizeCity("winston-salem")).toEqual({
      success: true,
      value: "Winston-Salem",
    });
  });

  test("handles apostrophes", () => {
    expect(normalizeCity("o'fallon")).toEqual({
      success: true,
      value: "O'Fallon",
    });
  });

  test("preserves minor words in the middle", () => {
    expect(normalizeCity("rio de janeiro")).toEqual({
      success: true,
      value: "Rio de Janeiro",
    });
    expect(normalizeCity("salt lake city")).toEqual({
      success: true,
      value: "Salt Lake City",
    });
  });

  test("trims whitespace", () => {
    expect(normalizeCity("  Chicago  ")).toEqual({
      success: true,
      value: "Chicago",
    });
  });

  test("normalizes multiple spaces", () => {
    expect(normalizeCity("New    York")).toEqual({
      success: true,
      value: "New York",
    });
  });

  test("accepts single word cities", () => {
    expect(normalizeCity("tokyo")).toEqual({ success: true, value: "Tokyo" });
    expect(normalizeCity("LONDON")).toEqual({ success: true, value: "London" });
  });

  test("fails for empty string", () => {
    const result = normalizeCity("");
    expect(result.success).toBe(false);
  });

  test("fails for whitespace only", () => {
    const result = normalizeCity("   ");
    expect(result.success).toBe(false);
  });

  test("fails for numeric-only input", () => {
    const result = normalizeCity("12345");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("reason");
  });

  test("fails for excessively long input", () => {
    const longName = "a".repeat(101);
    const result = normalizeCity(longName);
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("reason");
  });

  test("accepts names with numbers", () => {
    const result = normalizeCity("District 9");
    expect(result).toEqual({ success: true, value: "District 9" });
  });
});
