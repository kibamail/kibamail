/**
 * Tests for URL helpers (getBaseUrl, normalizePath)
 *
 * These run in the proxy + auth callback. A regression here can:
 *   - send the auth redirect to the wrong host (proxy spoofing protection),
 *   - drop the user on / instead of their intended post-login path.
 */

import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import { env } from "@/env/schema";
import { getBaseUrl, normalizePath } from "@/lib/url";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://kibamail.test/anything", {
    headers,
  });
}

describe("getBaseUrl", () => {
  test("returns the configured LOGTO_BASE_URL when no forwarded host is set", () => {
    const request = makeRequest();
    expect(getBaseUrl(request)).toBe(env.LOGTO_BASE_URL);
  });

  test("uses x-forwarded-host with default https proto", () => {
    const request = makeRequest({ "x-forwarded-host": "app.example.com" });
    expect(getBaseUrl(request)).toBe("https://app.example.com");
  });

  test("uses x-forwarded-proto when provided alongside x-forwarded-host", () => {
    const request = makeRequest({
      "x-forwarded-host": "app.example.com",
      "x-forwarded-proto": "http",
    });
    expect(getBaseUrl(request)).toBe("http://app.example.com");
  });

  test("ignores x-forwarded-proto when x-forwarded-host is absent", () => {
    // Without a forwarded host we should fall back to the configured base URL,
    // even if a proto is hinted — otherwise we'd build a malformed URL.
    const request = makeRequest({ "x-forwarded-proto": "http" });
    expect(getBaseUrl(request)).toBe(env.LOGTO_BASE_URL);
  });
});

describe("normalizePath", () => {
  test("returns '/w' for empty input", () => {
    expect(normalizePath("")).toBe("/w");
  });

  test("returns paths starting with '/' unchanged", () => {
    expect(normalizePath("/dashboard")).toBe("/dashboard");
    expect(normalizePath("/w/contacts?tab=lists")).toBe(
      "/w/contacts?tab=lists",
    );
  });

  test("extracts pathname from a full URL", () => {
    expect(normalizePath("https://kibamail.test/contacts/123")).toBe(
      "/contacts/123",
    );
  });

  test("prefixes '/' on bare relative paths", () => {
    expect(normalizePath("dashboard")).toBe("/dashboard");
    expect(normalizePath("foo/bar")).toBe("/foo/bar");
  });
});
