import { describe, expect, test } from "vitest";
import {
  normalizeTimezone,
  isValidTimezone,
} from "@/lib/contact-imports/normalizers/timezone";

describe("normalizeTimezone", () => {
  test("returns valid IANA timezone as-is", () => {
    expect(normalizeTimezone("America/New_York")).toEqual({
      success: true,
      value: "America/New_York",
    });
    expect(normalizeTimezone("Europe/London")).toEqual({
      success: true,
      value: "Europe/London",
    });
    expect(normalizeTimezone("Asia/Tokyo")).toEqual({
      success: true,
      value: "Asia/Tokyo",
    });
  });

  test("handles case insensitive IANA timezones", () => {
    expect(normalizeTimezone("america/new_york")).toEqual({
      success: true,
      value: "America/New_York",
    });
    expect(normalizeTimezone("EUROPE/LONDON")).toEqual({
      success: true,
      value: "Europe/London",
    });
  });

  test("converts US timezone abbreviations", () => {
    expect(normalizeTimezone("EST")).toEqual({
      success: true,
      value: "America/New_York",
    });
    expect(normalizeTimezone("PST")).toEqual({
      success: true,
      value: "America/Los_Angeles",
    });
    expect(normalizeTimezone("CST")).toEqual({
      success: true,
      value: "America/Chicago",
    });
    expect(normalizeTimezone("MST")).toEqual({
      success: true,
      value: "America/Denver",
    });
  });

  test("converts European timezone abbreviations", () => {
    expect(normalizeTimezone("GMT")).toEqual({
      success: true,
      value: "Etc/GMT",
    });
    expect(normalizeTimezone("UTC")).toEqual({
      success: true,
      value: "Etc/UTC",
    });
    expect(normalizeTimezone("CET")).toEqual({
      success: true,
      value: "Europe/Paris",
    });
    expect(normalizeTimezone("BST")).toEqual({
      success: true,
      value: "Europe/London",
    });
  });

  test("converts Asian/Pacific timezone abbreviations", () => {
    expect(normalizeTimezone("JST")).toEqual({
      success: true,
      value: "Asia/Tokyo",
    });
    expect(normalizeTimezone("IST")).toEqual({
      success: true,
      value: "Asia/Kolkata",
    });
    expect(normalizeTimezone("AEST")).toEqual({
      success: true,
      value: "Australia/Sydney",
    });
  });

  test("converts UTC offset format", () => {
    expect(normalizeTimezone("UTC+0")).toEqual({
      success: true,
      value: "Etc/UTC",
    });
    expect(normalizeTimezone("UTC+5")).toEqual({
      success: true,
      value: "Etc/GMT-5",
    });
    expect(normalizeTimezone("UTC-8")).toEqual({
      success: true,
      value: "Etc/GMT+8",
    });
  });

  test("converts GMT offset format", () => {
    expect(normalizeTimezone("GMT+0")).toEqual({
      success: true,
      value: "Etc/UTC",
    });
    expect(normalizeTimezone("GMT+5")).toEqual({
      success: true,
      value: "Etc/GMT-5",
    });
    expect(normalizeTimezone("GMT-8")).toEqual({
      success: true,
      value: "Etc/GMT+8",
    });
  });

  test("trims whitespace", () => {
    expect(normalizeTimezone("  America/New_York  ")).toEqual({
      success: true,
      value: "America/New_York",
    });
    expect(normalizeTimezone("  EST  ")).toEqual({
      success: true,
      value: "America/New_York",
    });
  });

  test("fails for empty string", () => {
    const result = normalizeTimezone("");
    expect(result.success).toBe(false);
  });

  test("fails for whitespace only", () => {
    const result = normalizeTimezone("   ");
    expect(result.success).toBe(false);
  });

  test("fails for unrecognized timezone", () => {
    const result = normalizeTimezone("Not/A/Timezone");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("reason");
  });

  test("fails for random text", () => {
    const result = normalizeTimezone("random timezone");
    expect(result.success).toBe(false);
  });
});

describe("isValidTimezone", () => {
  test("returns true for valid IANA timezones", () => {
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("Europe/London")).toBe(true);
  });

  test("returns false for abbreviations", () => {
    expect(isValidTimezone("EST")).toBe(false);
    expect(isValidTimezone("PST")).toBe(false);
  });

  test("returns false for invalid timezones", () => {
    expect(isValidTimezone("Not/Valid")).toBe(false);
  });
});
