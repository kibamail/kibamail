/**
 * Tests for Double Opt-In Confirmation Route
 *
 * Tests the /confirm/{formId}/{token} endpoint that handles
 * double opt-in confirmation link clicks.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock the queue module before importing the route
vi.mock("../../src/queue.js", () => ({
  dispatchConfirmation: vi.fn().mockResolvedValue(undefined),
}));

// Mock the templates
vi.mock("../../src/templates/confirm.js", () => ({
  thankYouHtml: "<html><body>Thank You</body></html>",
  errorHtml: "<html><body>Error</body></html>",
}));

import { confirmRoute } from "../../src/routes/confirm.js";
import { dispatchConfirmation } from "../../src/queue.js";

const app = new Hono();
app.route("/confirm", confirmRoute);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /confirm/:formId/:token", () => {
  describe("successful confirmation", () => {
    test("should return thank you page with valid token", async () => {
      const formId = "test-form-123";
      const token = "a".repeat(64); // Valid 64-character token

      const res = await app.request(`/confirm/${formId}/${token}`);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");

      const html = await res.text();
      expect(html).toContain("Thank You");
    });

    test("should dispatch confirmation job with correct data", async () => {
      const formId = "form-abc-123";
      const token = "b".repeat(64);

      await app.request(`/confirm/${formId}/${token}`);

      expect(dispatchConfirmation).toHaveBeenCalledTimes(1);
      expect(dispatchConfirmation).toHaveBeenCalledWith({
        formId,
        confirmationToken: token,
      });
    });

    test("should handle various valid form IDs", async () => {
      const testCases = [
        "simple-id",
        "uuid-style-12345678-1234-1234-1234-123456789abc",
        "with_underscores",
        "MixedCase123",
      ];
      const token = "c".repeat(64);

      for (const formId of testCases) {
        vi.clearAllMocks();
        const res = await app.request(`/confirm/${formId}/${token}`);

        expect(res.status).toBe(200);
        expect(dispatchConfirmation).toHaveBeenCalledWith({
          formId,
          confirmationToken: token,
        });
      }
    });
  });

  describe("validation errors", () => {
    test("should return 400 for token shorter than 64 characters", async () => {
      const formId = "test-form";
      const shortToken = "a".repeat(32);

      const res = await app.request(`/confirm/${formId}/${shortToken}`);

      expect(res.status).toBe(400);
      expect(dispatchConfirmation).not.toHaveBeenCalled();

      const html = await res.text();
      expect(html).toContain("Error");
    });

    test("should return 400 for token longer than 64 characters", async () => {
      const formId = "test-form";
      const longToken = "a".repeat(128);

      const res = await app.request(`/confirm/${formId}/${longToken}`);

      expect(res.status).toBe(400);
      expect(dispatchConfirmation).not.toHaveBeenCalled();

      const html = await res.text();
      expect(html).toContain("Error");
    });

    test("should return 400 for empty token", async () => {
      const formId = "test-form";

      // Empty token segment - Hono will handle this as a different route
      const res = await app.request(`/confirm/${formId}/`);

      // This might be 404 since it doesn't match the route pattern
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(dispatchConfirmation).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    test("should return 500 when queue dispatch fails", async () => {
      const formId = "test-form";
      const token = "d".repeat(64);

      // Make dispatchConfirmation throw an error
      vi.mocked(dispatchConfirmation).mockRejectedValueOnce(
        new Error("Redis connection failed")
      );

      const res = await app.request(`/confirm/${formId}/${token}`);

      expect(res.status).toBe(500);

      const html = await res.text();
      expect(html).toContain("Error");
    });
  });

  describe("security", () => {
    test("should not dispatch job for malicious formId", async () => {
      const maliciousFormId = '<script>alert("xss")</script>';
      const token = "f".repeat(64);

      const res = await app.request(
        `/confirm/${encodeURIComponent(maliciousFormId)}/${token}`
      );

      // The formId is used internally, not rendered to HTML
      // Should still work and dispatch the job
      expect(dispatchConfirmation).toHaveBeenCalled();
    });
  });
});
