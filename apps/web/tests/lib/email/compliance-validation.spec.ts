import { describe, expect, test } from "vitest";
import {
  validateEmailCompliance,
  type EmailComplianceType,
} from "@/lib/emails/compliance-validation";

const MARKETING_COMPLIANT_HTML = `<html><body>
  <p>Hello {{firstName}}</p>
  <footer>{{business_address}}</footer>
  <a href="{{unsubscribe_url}}">Unsubscribe</a>
  <a href="{{terms_url}}">Terms</a>
  <a href="{{privacy_url}}">Privacy</a>
</body></html>`;

const TRANSACTIONAL_COMPLIANT_HTML = `<html><body>
  <h1>Your receipt</h1>
  <p>Order #12345</p>
  <footer>{{business_address}}</footer>
</body></html>`;

describe("validateEmailCompliance", () => {
  describe("default (MARKETING) mode", () => {
    test("passes with all four required variables", () => {
      const result = validateEmailCompliance(MARKETING_COMPLIANT_HTML);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test("fails when business_address is missing", () => {
      const html = `<p>{{unsubscribe_url}} {{terms_url}} {{privacy_url}}</p>`;
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(
        expect.arrayContaining([expect.stringContaining("business_address")]),
      );
    });

    test("fails when unsubscribe_url is missing", () => {
      const html = `<p>{{business_address}} {{terms_url}} {{privacy_url}}</p>`;
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(
        expect.arrayContaining([expect.stringContaining("unsubscribe_url")]),
      );
    });

    test("fails when terms_url is missing", () => {
      const html = `<p>{{business_address}} {{unsubscribe_url}} {{privacy_url}}</p>`;
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(
        expect.arrayContaining([expect.stringContaining("terms_url")]),
      );
    });

    test("fails when privacy_url is missing", () => {
      const html = `<p>{{business_address}} {{unsubscribe_url}} {{terms_url}}</p>`;
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(
        expect.arrayContaining([expect.stringContaining("privacy_url")]),
      );
    });

    test("fails with all four missing", () => {
      const html = `<p>Hello world</p>`;
      const result = validateEmailCompliance(html);
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(4);
    });

    test("returns empty string as invalid with all four missing", () => {
      const result = validateEmailCompliance("");
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(4);
    });

    test("is used when no type option is specified", () => {
      const result = validateEmailCompliance(TRANSACTIONAL_COMPLIANT_HTML);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    test("is used when type is explicitly MARKETING", () => {
      const result = validateEmailCompliance(TRANSACTIONAL_COMPLIANT_HTML, {
        type: "MARKETING",
      });
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe("TRANSACTIONAL mode", () => {
    test("passes with only business_address", () => {
      const result = validateEmailCompliance(TRANSACTIONAL_COMPLIANT_HTML, {
        type: "TRANSACTIONAL",
      });
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test("fails when business_address is missing", () => {
      const html = `<html><body><p>Your receipt</p></body></html>`;
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(
        expect.arrayContaining([expect.stringContaining("business_address")]),
      );
    });

    test("does not require unsubscribe_url", () => {
      const html = `<p>{{business_address}}</p>`;
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(true);
    });

    test("does not require terms_url", () => {
      const html = `<p>{{business_address}}</p>`;
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(true);
    });

    test("does not require privacy_url", () => {
      const html = `<p>{{business_address}}</p>`;
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(true);
    });

    test("returns empty string as invalid with only business_address missing", () => {
      const result = validateEmailCompliance("", { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0]).toContain("business_address");
    });

    test("passes when extra compliance variables are present alongside business_address", () => {
      const html = `<p>{{business_address}} {{unsubscribe_url}}</p>`;
      const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
      expect(result.valid).toBe(true);
    });

    test("fails with only one missing variable for empty html", () => {
      const result = validateEmailCompliance("", { type: "TRANSACTIONAL" });
      expect(result.missing).toHaveLength(1);
    });
  });

  describe("MARKETING vs TRANSACTIONAL difference", () => {
    test("same HTML can pass TRANSACTIONAL but fail MARKETING", () => {
      const html = `<p>{{business_address}}</p>`;
      const marketingResult = validateEmailCompliance(html, {
        type: "MARKETING",
      });
      const transactionalResult = validateEmailCompliance(html, {
        type: "TRANSACTIONAL",
      });

      expect(marketingResult.valid).toBe(false);
      expect(transactionalResult.valid).toBe(true);
    });

    test("HTML that passes MARKETING always passes TRANSACTIONAL", () => {
      const marketingResult = validateEmailCompliance(
        MARKETING_COMPLIANT_HTML,
        { type: "MARKETING" },
      );
      const transactionalResult = validateEmailCompliance(
        MARKETING_COMPLIANT_HTML,
        { type: "TRANSACTIONAL" },
      );

      expect(marketingResult.valid).toBe(true);
      expect(transactionalResult.valid).toBe(true);
    });
  });
});
