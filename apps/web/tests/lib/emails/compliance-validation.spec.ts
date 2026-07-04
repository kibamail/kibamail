import { describe, expect, test } from "vitest";
import {
  validateEmailCompliance,
  type EmailComplianceType,
} from "@/lib/emails/compliance-validation";

describe("validateEmailCompliance", () => {
  describe("MARKETING type (default)", () => {
    test("passes when all 4 required variables are present", () => {
      const html = `<html><body>
        <p>{{business_address}}</p>
        <a href="{{unsubscribe_url}}">Unsubscribe</a>
        <a href="{{terms_url}}">Terms</a>
        <a href="{{privacy_url}}">Privacy</a>
      </body></html>`;

      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test("fails when all marketing variables are missing", () => {
      const html = "<p>Hello</p>";
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBe(4);
      expect(result.missing).toContain("Business address ({{business_address}})");
      expect(result.missing).toContain("Unsubscribe link ({{unsubscribe_url}})");
      expect(result.missing).toContain("Terms of service link ({{terms_url}})");
      expect(result.missing).toContain("Privacy policy link ({{privacy_url}})");
    });

    test("fails when only some required variables are present", () => {
      const html = `<p>{{business_address}}</p><a href="{{unsubscribe_url}}">Unsub</a>`;
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBe(2);
      expect(result.missing).toContain("Terms of service link ({{terms_url}})");
      expect(result.missing).toContain("Privacy policy link ({{privacy_url}})");
    });

    test("fails when only business_address is present", () => {
      const html = "<p>{{business_address}}</p>";
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBe(3);
    });

    test("defaults to MARKETING when type is not specified", () => {
      const html = "<p>{{business_address}}</p>";
      const resultNoType = validateEmailCompliance(html);
      const resultMarketing = validateEmailCompliance(html, {
        type: "MARKETING",
      });
      expect(resultNoType).toEqual(resultMarketing);
    });
  });

  describe("TRANSACTIONAL type", () => {
    test("passes when only {{business_address}} is present", () => {
      const html = "<p>Receipt</p><footer>{{business_address}}</footer>";
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test("fails when {{business_address}} is missing", () => {
      const html = "<p>Your receipt is ready</p>";
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBe(1);
      expect(result.missing).toContain("Business address ({{business_address}})");
    });

    test("does not require unsubscribe_url", () => {
      const html = "<p>{{business_address}}</p>";
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(true);
    });

    test("does not require terms_url or privacy_url", () => {
      const html = "<p>{{business_address}}</p>";
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(true);
    });
  });

  describe("empty / falsy HTML", () => {
    test("returns invalid for empty string", () => {
      const result = validateEmailCompliance("");
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBe(4);
    });

    test("returns invalid for null-ish input (falsy)", () => {
      const result = validateEmailCompliance("" as string);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    test("empty string with TRANSACTIONAL type reports only business_address missing", () => {
      const result = validateEmailCompliance("", { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBe(1);
      expect(result.missing).toContain("Business address ({{business_address}})");
    });
  });

  describe("missing labels format", () => {
    test("returns human-readable labels, not raw variable names", () => {
      const result = validateEmailCompliance("<p>hi</p>");
      for (const label of result.missing) {
        expect(label).toMatch(/\{\{.*\}\}/);
      }
    });
  });
});
