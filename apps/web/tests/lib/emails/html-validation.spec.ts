import { describe, expect, test } from "vitest";
import { validateEmailHtml } from "@/lib/emails/html-validation";

describe("validateEmailHtml", () => {
  describe("empty / whitespace input", () => {
    test("rejects empty string", () => {
      const result = validateEmailHtml("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain("required");
      expect(result.warnings).toEqual([]);
      expect(result.variables).toEqual([]);
    });

    test("rejects whitespace-only string", () => {
      const result = validateEmailHtml("   ");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });
  });

  describe("valid HTML", () => {
    test("accepts valid HTML with no issues", () => {
      const result = validateEmailHtml("<p>Hello {{firstName}}</p>");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("extracts variables from HTML", () => {
      const result = validateEmailHtml(
        "<p>{{firstName}} {{lastName}} {{email}}</p>",
      );
      expect(result.variables).toContain("firstName");
      expect(result.variables).toContain("lastName");
      expect(result.variables).toContain("email");
    });
  });

  describe("dangerous tags", () => {
    test("warns about <script> tag", () => {
      const result = validateEmailHtml(
        '<p>Content</p><script>alert("xss")</script>',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      const scriptWarning = result.warnings.find((w) =>
        w.message.includes("<script>"),
      );
      expect(scriptWarning).toBeDefined();
    });

    test("warns about <iframe> tag", () => {
      const result = validateEmailHtml(
        '<p>Content</p><iframe src="https://evil.com"></iframe>',
      );
      expect(result.valid).toBe(true);
      const iframeWarning = result.warnings.find((w) =>
        w.message.includes("<iframe>"),
      );
      expect(iframeWarning).toBeDefined();
    });

    test("warns about <object> tag", () => {
      const result = validateEmailHtml(
        '<object data="file.swf"></object>',
      );
      const objectWarning = result.warnings.find((w) =>
        w.message.includes("<object>"),
      );
      expect(objectWarning).toBeDefined();
    });

    test("warns about <embed> tag", () => {
      const result = validateEmailHtml('<embed src="file.swf">');
      const embedWarning = result.warnings.find((w) =>
        w.message.includes("<embed>"),
      );
      expect(embedWarning).toBeDefined();
    });

    test("warns about <applet> tag", () => {
      const result = validateEmailHtml('<applet code="App.class"></applet>');
      const appletWarning = result.warnings.find((w) =>
        w.message.includes("<applet>"),
      );
      expect(appletWarning).toBeDefined();
    });

    test("warns about multiple dangerous tags in one document", () => {
      const result = validateEmailHtml(
        '<script>x</script><iframe>y</iframe><p>ok</p>',
      );
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });

    test("dangerous tags produce warnings, not errors", () => {
      const result = validateEmailHtml('<script>alert(1)</script>');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("unknown variables", () => {
    test("warns about unknown variable", () => {
      const result = validateEmailHtml("<p>{{nonexistent_variable}}</p>");
      const unknownWarning = result.warnings.find((w) =>
        w.message.includes("Unknown variable"),
      );
      expect(unknownWarning).toBeDefined();
      expect(unknownWarning?.message).toContain("nonexistent_variable");
    });

    test("does not warn about known standard variables", () => {
      const result = validateEmailHtml(
        "<p>{{firstName}} {{email}} {{unsubscribe_url}}</p>",
      );
      const unknownWarning = result.warnings.find((w) =>
        w.message.includes("Unknown variable"),
      );
      expect(unknownWarning).toBeUndefined();
    });

    test("does not warn about contact. custom properties", () => {
      const result = validateEmailHtml(
        "<p>{{contact.company_name}}</p>",
      );
      const unknownWarning = result.warnings.find((w) =>
        w.message.includes("Unknown variable"),
      );
      expect(unknownWarning).toBeUndefined();
    });

    test("unknown variables produce warnings, not errors", () => {
      const result = validateEmailHtml("<p>{{totally_unknown}}</p>");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("result structure", () => {
    test("returns all fields on valid HTML", () => {
      const result = validateEmailHtml("<p>Hello</p>");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("variables");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.variables)).toBe(true);
    });
  });
});
