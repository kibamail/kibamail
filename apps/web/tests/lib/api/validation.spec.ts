/**
 * Tests for validateRequestBody
 *
 * Every API route uses this helper to parse + validate JSON bodies. A
 * regression here means either:
 *   - invalid input silently passes through (data corruption, security risk),
 *   - well-formed input is rejected (broken integrations),
 *   - malformed JSON is reported with the wrong shape so withErrorHandling
 *     can no longer turn it into a clean 422.
 */

import { describe, expect, test } from "vitest";
import { z, ZodError } from "zod";
import { validateRequestBody } from "@/lib/api/validation";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

function makeJsonRequest(body: string): Request {
  return new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("validateRequestBody (default: throws)", () => {
  test("returns parsed data for a valid body", async () => {
    const request = makeJsonRequest(
      JSON.stringify({ email: "user@example.com", name: "Alice" }),
    );

    const data = await validateRequestBody(schema, request);
    expect(data).toEqual({ email: "user@example.com", name: "Alice" });
  });

  test("throws ZodError when the schema rejects the body", async () => {
    const request = makeJsonRequest(
      JSON.stringify({ email: "not-an-email", name: "A" }),
    );

    await expect(validateRequestBody(schema, request)).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  test("throws a ZodError-shaped object on malformed JSON", async () => {
    const request = makeJsonRequest("{ not valid json");

    let caught: unknown;
    try {
      await validateRequestBody(schema, request);
    } catch (error) {
      caught = error;
    }

    // The implementation builds a manually-constructed ZodError-compatible
    // object so withErrorHandling can render a 422 with a meaningful issue.
    expect(caught).toBeDefined();
    expect((caught as { name?: string }).name).toBe("ZodError");
    const issues = (caught as { issues?: unknown }).issues as Array<{
      code: string;
      message: string;
      path: unknown[];
    }>;
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].code).toBe("custom");
    expect(issues[0].message).toBe("Invalid JSON in request body");
    expect(issues[0].path).toEqual([]);
  });
});

describe("validateRequestBody (shouldThrow: false)", () => {
  test("returns success result for a valid body", async () => {
    const request = makeJsonRequest(
      JSON.stringify({ email: "user@example.com", name: "Alice" }),
    );

    const result = await validateRequestBody(schema, request, {
      shouldThrow: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ email: "user@example.com", name: "Alice" });
    }
  });

  test("returns failure result with ZodError for invalid bodies", async () => {
    const request = makeJsonRequest(
      JSON.stringify({ email: "not-an-email", name: "A" }),
    );

    const result = await validateRequestBody(schema, request, {
      shouldThrow: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      // Both fields should fail
      const fields = result.error.issues.map((i) => i.path.join("."));
      expect(fields).toEqual(expect.arrayContaining(["email", "name"]));
    }
  });

  test("returns failure result on malformed JSON instead of throwing", async () => {
    const request = makeJsonRequest("definitely not json");

    const result = await validateRequestBody(schema, request, {
      shouldThrow: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as { name: string }).name).toBe("ZodError");
      expect(result.error.issues[0].message).toBe(
        "Invalid JSON in request body",
      );
    }
  });
});
