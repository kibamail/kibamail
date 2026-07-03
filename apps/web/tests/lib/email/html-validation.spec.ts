import { describe, expect, test } from "vitest";
import { validateEmailHtml } from "@/lib/emails/html-validation";

describe("validateEmailHtml", () => {
  describe("empty / whitespace input", () => {
    test("rejects empty string", () => {
      const result = validateEmailHtml("");
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("html");
      expect(result.errors[0].message).toContain("required");
    });

    test("rejects whitespace-only string", () => {
      const result = validateEmailHtml("   ");
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("valid HTML", () => {
    test("accepts simple valid HTML", () => {
      const result = validateEmailHtml("<p>Hello world</p>");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("accepts full HTML document", () => {
      const result = validateEmailHtml(
        "<html><body><h1>Title</h1><p>Content</p></body></html>",
      );
      expect(result.valid).toBe(true);
    });

    test("extracts variables from HTML", () => {
      const result = validateEmailHtml(
        "<p>Hello {{firstName}}, welcome!</p>",
      );
      expect(result.valid).toBe(true);
      expect(result.variables).toContain("firstName");
    });

    test("extracts multiple variables", () => {
      const result = validateEmailHtml(
        "<p>{{firstName}} {{lastName}} {{email}}</p>",
      );
      expect(result.variables).toContain("firstName");
      expect(result.variables).toContain("lastName");
      expect(result.variables).toContain("email");
    });
  });

  describe("dangerous tags (warnings)", () => {
    test("warns about <script> tags", () => {
      const result = validateEmailHtml(
        '<p>Hello</p><script>alert("xss")</script>',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "html",
            message: expect.stringContaining("<script>"),
          }),
        ]),
      );
    });

    test("warns about <iframe> tags", () => {
      const result = validateEmailHtml(
        '<p>Hello</p><iframe src="https://evil.com"></iframe>',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "html",
            message: expect.stringContaining("<iframe>"),
          }),
        ]),
      );
    });

    test("warns about <object> tags", () => {
      const result = validateEmailHtml(
        '<p>Hello</p><object data="file.swf"></object>',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "html",
            message: expect.stringContaining("<object>"),
          }),
        ]),
      );
    });

    test("warns about <embed> tags", () => {
      const result = validateEmailHtml(
        '<p>Hello</p><embed src="file.swf">',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "html",
            message: expect.stringContaining("<embed>"),
          }),
        ]),
      );
    });

    test("warns about <applet> tags", () => {
      const result = validateEmailHtml(
        '<p>Hello</p><applet code="Main.class"></applet>',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "html",
            message: expect.stringContaining("<applet>"),
          }),
        ]),
      );
    });

    test("does not warn about safe HTML", () => {
      const result = validateEmailHtml("<p>Hello <b>world</b></p>");
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("variable validation (warnings)", () => {
    test("warns about unknown variables", () => {
      const result = validateEmailHtml("<p>{{unknownVar}}</p>");
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "html",
            message: expect.stringContaining("unknownVar"),
          }),
        ]),
      );
    });

    test("does not warn about standard variables", () => {
      const result = validateEmailHtml(
        "<p>{{firstName}} {{email}} {{unsubscribe_url}}</p>",
      );
      expect(result.valid).toBe(true);
      const unknownWarnings = result.warnings.filter(
        (w) => w.message.includes("Unknown variable"),
      );
      expect(unknownWarnings).toHaveLength(0);
    });

    test("does not warn about custom contact properties", () => {
      const result = validateEmailHtml("<p>{{contact.company}}</p>");
      expect(result.valid).toBe(true);
      const unknownWarnings = result.warnings.filter(
        (w) => w.message.includes("Unknown variable"),
      );
      expect(unknownWarnings).toHaveLength(0);
    });

    test("warns about each unknown variable separately", () => {
      const result = validateEmailHtml(
        "<p>{{foo}} {{bar}} {{baz}}</p>",
      );
      expect(result.valid).toBe(true);
      const unknownWarnings = result.warnings.filter(
        (w) => w.message.includes("Unknown variable"),
      );
      expect(unknownWarnings).toHaveLength(3);
    });
  });

  describe("combined scenarios", () => {
    test("reports both dangerous tag warnings and unknown variable warnings", () => {
      const result = validateEmailHtml(
        '<p>{{foo}}</p><script>alert(1)</script>',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });

    test("reports no warnings for clean HTML with known variables", () => {
      const result = validateEmailHtml(
        '<p>Hello {{firstName}}, <a href="{{unsubscribe_url}}">unsubscribe</a></p>',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.variables).toContain("firstName");
      expect(result.variables).toContain("unsubscribe_url");
    });
  });
});
