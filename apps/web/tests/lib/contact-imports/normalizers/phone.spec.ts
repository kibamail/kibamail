import { describe, expect, test } from "vitest";
import { normalizePhone } from "@/lib/contact-imports/normalizers/phone";

describe("normalizePhone", () => {
  test("normalizes US phone number to E.164", () => {
    const result = normalizePhone("(415) 555-2671", "US");
    expect(result).toEqual({ success: true, value: "+14155552671" });
  });

  test("normalizes international format", () => {
    const result = normalizePhone("+1 415 555 2671");
    expect(result).toEqual({ success: true, value: "+14155552671" });
  });

  test("normalizes UK phone number with country hint", () => {
    const result = normalizePhone("020 7946 0958", "GB");
    expect(result).toEqual({ success: true, value: "+442079460958" });
  });

  test("normalizes German phone number", () => {
    const result = normalizePhone("+49 30 123456");
    expect(result).toEqual({ success: true, value: "+4930123456" });
  });

  test("normalizes phone with dashes", () => {
    const result = normalizePhone("415-555-2671", "US");
    expect(result).toEqual({ success: true, value: "+14155552671" });
  });

  test("normalizes phone with dots", () => {
    const result = normalizePhone("415.555.2671", "US");
    expect(result).toEqual({ success: true, value: "+14155552671" });
  });

  test("fails for empty string", () => {
    const result = normalizePhone("");
    expect(result.success).toBe(false);
  });

  test("fails for whitespace only", () => {
    const result = normalizePhone("   ");
    expect(result.success).toBe(false);
  });

  test("fails for invalid phone number", () => {
    const result = normalizePhone("not a phone");
    expect(result.success).toBe(false);
  });

  test("fails for too short number", () => {
    const result = normalizePhone("123", "US");
    expect(result.success).toBe(false);
  });

  test("handles phone with extension gracefully", () => {
    const result = normalizePhone("+1 415 555 2671 ext 123");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("value");
  });
});
