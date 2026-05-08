/**
 * Tests for the form settings Zod schema.
 *
 * formSettingsSchema gates what shape can be persisted as a form's behavior
 * config (post-submit redirect/message, double opt-in, duplicate prevention).
 * A regression — accepting a non-URL redirect, dropping the discriminator,
 * or losing the default for `preventDuplicateSubmissions` — directly affects
 * what end users see after submitting a form, so the contract is worth
 * pinning.
 */

import { describe, expect, test } from "vitest";
import { formSettingsSchema } from "@/lib/forms/settings-schema";

describe("formSettingsSchema", () => {
  test("accepts an empty object and applies the default for preventDuplicateSubmissions", () => {
    const parsed = formSettingsSchema.parse({});
    expect(parsed.preventDuplicateSubmissions).toBe(false);
    expect(parsed.successAction).toBeUndefined();
    expect(parsed.doubleOptIn).toBeUndefined();
  });

  test("accepts a message-style success action with optional message", () => {
    const parsed = formSettingsSchema.parse({
      successAction: { type: "message", message: "Thanks!" },
    });
    expect(parsed.successAction).toEqual({
      type: "message",
      message: "Thanks!",
    });
  });

  test("accepts a message-style success action with no message", () => {
    const parsed = formSettingsSchema.parse({
      successAction: { type: "message" },
    });
    expect(parsed.successAction).toEqual({ type: "message" });
  });

  test("accepts a redirect-style success action and defaults openInNewTab to false", () => {
    const parsed = formSettingsSchema.parse({
      successAction: { type: "redirect", url: "https://example.com/thanks" },
    });
    expect(parsed.successAction).toEqual({
      type: "redirect",
      url: "https://example.com/thanks",
      openInNewTab: false,
    });
  });

  test("rejects a redirect with a non-URL string", () => {
    const result = formSettingsSchema.safeParse({
      successAction: { type: "redirect", url: "not-a-url" },
    });
    expect(result.success).toBe(false);
  });

  test("rejects a redirect missing the url field", () => {
    const result = formSettingsSchema.safeParse({
      successAction: { type: "redirect" },
    });
    expect(result.success).toBe(false);
  });

  test("rejects an unknown success action type (discriminated union)", () => {
    const result = formSettingsSchema.safeParse({
      successAction: { type: "popup", message: "hi" },
    });
    expect(result.success).toBe(false);
  });

  test("rejects a successAction missing the discriminator entirely", () => {
    const result = formSettingsSchema.safeParse({
      successAction: { message: "hi" },
    });
    expect(result.success).toBe(false);
  });

  test("accepts doubleOptIn config", () => {
    const enabled = formSettingsSchema.parse({
      doubleOptIn: { enabled: true },
    });
    const disabled = formSettingsSchema.parse({
      doubleOptIn: { enabled: false },
    });
    expect(enabled.doubleOptIn).toEqual({ enabled: true });
    expect(disabled.doubleOptIn).toEqual({ enabled: false });
  });

  test("rejects doubleOptIn without the enabled flag", () => {
    const result = formSettingsSchema.safeParse({ doubleOptIn: {} });
    expect(result.success).toBe(false);
  });

  test("respects an explicit preventDuplicateSubmissions value", () => {
    const t = formSettingsSchema.parse({ preventDuplicateSubmissions: true });
    const f = formSettingsSchema.parse({ preventDuplicateSubmissions: false });
    expect(t.preventDuplicateSubmissions).toBe(true);
    expect(f.preventDuplicateSubmissions).toBe(false);
  });

  test("rejects non-boolean preventDuplicateSubmissions", () => {
    const result = formSettingsSchema.safeParse({
      preventDuplicateSubmissions: "yes",
    });
    expect(result.success).toBe(false);
  });
});
