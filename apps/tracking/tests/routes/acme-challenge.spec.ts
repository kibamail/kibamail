/**
 * Tests for ACME Challenge Route
 *
 * Tests the /.well-known/acme-challenge/{token} endpoint that serves
 * HTTP-01 challenge responses for Let's Encrypt SSL certificate validation.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";

// Mock fetch to simulate internal API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the env module
vi.mock("../../src/env.js", () => ({
  env: {
    INTERNAL_API_URL: "http://localhost:3000",
    INTERNAL_SERVICE_KEY: "test-internal-service-key",
  },
}));

import { acmeChallengeRoute } from "../../src/routes/acme-challenge.js";

const app = new Hono();
app.route("/.well-known/acme-challenge", acmeChallengeRoute);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /.well-known/acme-challenge/:token", () => {
  describe("successful challenge response", () => {
    test("should return key authorization as plain text", async () => {
      const token = "challenge-token-abc123";
      const keyAuthorization = "challenge-token-abc123.account-thumbprint-xyz";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keyAuthorization }),
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/plain");

      const text = await res.text();
      expect(text).toBe(keyAuthorization);
    });

    test("should call internal API with correct URL", async () => {
      const token = "specific-token-123";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keyAuthorization: "key-auth" }),
      });

      await app.request(`/.well-known/acme-challenge/${token}`);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/internal/v1/acme-challenges/${token}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-internal-service-key",
          }),
        }),
      );
    });

    test("should include Authorization header with service key", async () => {
      const token = "auth-test-token";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keyAuthorization: "key-auth" }),
      });

      await app.request(`/.well-known/acme-challenge/${token}`);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-internal-service-key",
          },
        }),
      );
    });
  });

  describe("error handling", () => {
    test("should return 404 when internal API returns 404", async () => {
      const token = "not-found-token";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Not Found");
    });

    test("should return 404 when internal API returns 401", async () => {
      const token = "unauthorized-token";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(404);
    });

    test("should return 404 when internal API returns 500", async () => {
      const token = "error-token";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(404);
    });

    test("should return 404 when keyAuthorization is missing from response", async () => {
      const token = "missing-key-token";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Challenge not found" }),
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Not Found");
    });

    test("should return 500 when fetch throws an error", async () => {
      const token = "fetch-error-token";

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).toBe("Internal Server Error");
    });

    test("should return 500 when JSON parsing fails", async () => {
      const token = "json-error-token";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(500);
    });
  });

  describe("token handling", () => {
    test("should handle long tokens", async () => {
      const token = "a".repeat(100);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keyAuthorization: "key-auth" }),
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(token),
        expect.any(Object),
      );
    });

    test("should handle tokens with special URL-safe characters", async () => {
      const token = "token-with-dashes_and_underscores";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keyAuthorization: "key-auth" }),
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(token),
        expect.any(Object),
      );
    });
  });

  describe("response format", () => {
    test("should return exactly the key authorization without extra whitespace", async () => {
      const token = "format-test-token";
      const keyAuthorization = "exact-value.with-thumbprint";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keyAuthorization }),
      });

      const res = await app.request(
        `/.well-known/acme-challenge/${token}`,
      );

      const text = await res.text();
      expect(text).toBe(keyAuthorization);
      expect(text.trim()).toBe(text); // No extra whitespace
    });
  });
});
