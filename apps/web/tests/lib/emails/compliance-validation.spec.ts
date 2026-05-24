import { describe, expect, test } from "vitest";
import { validateEmailCompliance } from "@/lib/emails/compliance-validation";

const FULL_MARKETING_HTML = `
  <html>
    <body>
      <p>Hello {{firstName}}</p>
      <p>{{business_address}}</p>
      <a href="{{unsubscribe_url}}">Unsubscribe</a>
      <a href="{{terms_url}}">Terms</a>
      <a href="{{privacy_url}}">Privacy</a>
    </body>
  </html>
`;

describe("validateEmailCompliance (MARKETING - default)", () => {
  test("passes when all required marketing variables are present", () => {
    const result = validateEmailCompliance(FULL_MARKETING_HTML);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  test("defaults to MARKETING when options omitted", () => {
    const defaulted = validateEmailCompliance(FULL_MARKETING_HTML);
    const explicit = validateEmailCompliance(FULL_MARKETING_HTML, {
      type: "MARKETING",
    });
    expect(defaulted).toEqual(explicit);
  });

  test("reports missing unsubscribe_url with human-readable label", () => {
    const html = `
      <p>{{business_address}}</p>
      <a href="{{terms_url}}">Terms</a>
      <a href="{{privacy_url}}">Privacy</a>
    `;
    const result = validateEmailCompliance(html);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain(
      "Unsubscribe link ({{unsubscribe_url}})",
    );
    expect(result.missing).toHaveLength(1);
  });

  test("reports every missing variable when none are present", () => {
    const result = validateEmailCompliance("<p>no variables here</p>");
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([
      "Business address ({{business_address}})",
      "Unsubscribe link ({{unsubscribe_url}})",
      "Terms of service link ({{terms_url}})",
      "Privacy policy link ({{privacy_url}})",
    ]);
  });

  test("returns all required labels when html is empty string", () => {
    const result = validateEmailCompliance("");
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([
      "Business address ({{business_address}})",
      "Unsubscribe link ({{unsubscribe_url}})",
      "Terms of service link ({{terms_url}})",
      "Privacy policy link ({{privacy_url}})",
    ]);
  });

  test("ignores presence of unrelated variables", () => {
    const html = "<p>{{firstName}} {{lastName}} {{city}}</p>";
    const result = validateEmailCompliance(html);
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(4);
  });
});

describe("validateEmailCompliance (TRANSACTIONAL)", () => {
  test("passes when only business_address is present", () => {
    const html = "<p>{{business_address}}</p>";
    const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  test("does NOT require unsubscribe_url for transactional emails", () => {
    const html = "<p>{{business_address}}</p><p>Receipt details</p>";
    const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
    expect(result.valid).toBe(true);
    expect(result.missing).not.toContain(
      "Unsubscribe link ({{unsubscribe_url}})",
    );
  });

  test("fails when business_address is missing", () => {
    const html = "<p>Your code is 123456</p>";
    const result = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([
      "Business address ({{business_address}})",
    ]);
  });

  test("returns all required labels when html is empty string", () => {
    const result = validateEmailCompliance("", { type: "TRANSACTIONAL" });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([
      "Business address ({{business_address}})",
    ]);
  });
});
