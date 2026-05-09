/**
 * Tests for forms/html-validation
 *
 * Validates the bidirectional consistency rules between user-supplied form HTML
 * and the API field-mapping sidecar. Mistakes here cause form submissions to
 * silently drop fields or to reject valid submissions, so these checks are on
 * the critical path for every public form submission.
 */

import { describe, expect, test } from "vitest";
import {
  extractInputFieldsFromHtml,
  validateFormHtml,
  validateHtmlFieldMapping,
  type ApiFieldMapping,
} from "@/lib/forms/html-validation";

const standardEmail = {
  contactPropertyId: "email",
  contactPropertyType: "standard" as const,
  fieldType: "string" as const,
};

const customString = {
  contactPropertyId: "cp_1",
  contactPropertyType: "custom" as const,
  fieldType: "string" as const,
};

describe("extractInputFieldsFromHtml", () => {
  test("returns named input, select, and textarea fields", () => {
    const html = `
      <form>
        <input name="email" type="email" />
        <select name="country"><option value="US">US</option></select>
        <textarea name="bio"></textarea>
      </form>
    `;

    const fields = extractInputFieldsFromHtml(html);
    const names = fields.map((f) => f.name).sort();
    expect(names).toEqual(["bio", "country", "email"]);

    const tagNames = new Set(fields.map((f) => f.tagName));
    expect(tagNames).toEqual(new Set(["input", "select", "textarea"]));
  });

  test("ignores inputs without a name attribute", () => {
    const html = `
      <form>
        <input name="email" />
        <input type="text" />
      </form>
    `;

    const fields = extractInputFieldsFromHtml(html);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("email");
  });

  test("excludes control input types (submit, button, reset, image)", () => {
    const html = `
      <form>
        <input name="email" type="email" />
        <input name="submit_button" type="submit" />
        <input name="cancel" type="reset" />
        <input name="action" type="button" />
        <input name="img" type="image" />
      </form>
    `;

    const fields = extractInputFieldsFromHtml(html);
    expect(fields.map((f) => f.name)).toEqual(["email"]);
  });

  test("control type matching is case-insensitive", () => {
    const html = `
      <form>
        <input name="email" />
        <input name="submit_btn" type="SUBMIT" />
      </form>
    `;

    const fields = extractInputFieldsFromHtml(html);
    expect(fields.map((f) => f.name)).toEqual(["email"]);
  });

  test("does not exclude select/textarea even with type-like names", () => {
    const html = `
      <form>
        <select name="submit"><option>A</option></select>
        <textarea name="button"></textarea>
      </form>
    `;

    const fields = extractInputFieldsFromHtml(html);
    expect(fields.map((f) => f.name).sort()).toEqual(["button", "submit"]);
  });

  test("returns empty array when there is no form element", () => {
    const html = `<div><input name="email" /></div>`;
    expect(extractInputFieldsFromHtml(html)).toEqual([]);
  });

  test("returns empty array when there are multiple form elements", () => {
    const html = `
      <form><input name="a" /></form>
      <form><input name="b" /></form>
    `;
    expect(extractInputFieldsFromHtml(html)).toEqual([]);
  });

  test("only extracts fields nested inside the single form (ignores outside inputs)", () => {
    const html = `
      <input name="outside" />
      <form>
        <input name="inside" />
      </form>
    `;

    const fields = extractInputFieldsFromHtml(html);
    expect(fields.map((f) => f.name)).toEqual(["inside"]);
  });

  test("returns multiple fields with the same name (e.g. radio groups)", () => {
    const html = `
      <form>
        <input type="radio" name="choice" value="a" />
        <input type="radio" name="choice" value="b" />
      </form>
    `;

    const fields = extractInputFieldsFromHtml(html);
    expect(fields).toHaveLength(2);
    expect(fields.every((f) => f.name === "choice")).toBe(true);
  });
});

describe("validateFormHtml", () => {
  test("accepts HTML with exactly one form", () => {
    const result = validateFormHtml(`<form><input name="email" /></form>`);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects HTML with no form", () => {
    const result = validateFormHtml(`<div><input name="email" /></div>`);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: "_html", message: "HTML must contain a <form> element" },
    ]);
  });

  test("rejects HTML with multiple forms and reports the count", () => {
    const result = validateFormHtml(`<form></form><form></form><form></form>`);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("_html");
    expect(result.errors[0].message).toContain("found 3");
  });
});

describe("validateHtmlFieldMapping", () => {
  test("returns the html-structure error and short-circuits when html is invalid", () => {
    const html = `<div><input name="email" /></div>`;
    const mapping: ApiFieldMapping = { email: standardEmail };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("_html");
  });

  test("flags orphan mappings whose field name is not in the HTML", () => {
    const html = `<form><input name="email" /></form>`;
    const mapping: ApiFieldMapping = {
      email: standardEmail,
      ghost: customString,
    };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");

    expect(result.valid).toBe(false);
    const ghostError = result.errors.find((e) => e.field === "ghost");
    expect(ghostError?.message).toContain("does not exist in the HTML form");
  });

  test("flags unmapped fields that have no fieldMapping entry", () => {
    const html = `
      <form>
        <input name="email" />
        <input name="firstName" />
      </form>
    `;
    const mapping: ApiFieldMapping = { email: standardEmail };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");

    expect(result.valid).toBe(false);
    const unmapped = result.errors.find((e) => e.field === "firstName");
    expect(unmapped?.message).toContain("has no entry in fieldMapping");
  });

  test("SIGN_UP forms require a mapping to the standard 'email' contact property", () => {
    const html = `<form><input name="firstName" /></form>`;
    const mapping: ApiFieldMapping = {
      firstName: {
        contactPropertyId: "firstName",
        contactPropertyType: "standard",
        fieldType: "string",
      },
    };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");

    expect(result.valid).toBe(false);
    const formError = result.errors.find((e) => e.field === "_form");
    expect(formError?.message).toContain("require at least one field mapped");
  });

  test("a custom property whose id is 'email' does NOT satisfy the SIGN_UP requirement", () => {
    // Only standard.email counts as the email property — guards against a
    // custom property that happens to be named "email" being treated as the
    // canonical email mapping.
    const html = `<form><input name="contact" /></form>`;
    const mapping: ApiFieldMapping = {
      contact: {
        contactPropertyId: "email",
        contactPropertyType: "custom",
        fieldType: "string",
      },
    };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "_form")).toBe(true);
  });

  test("SURVEY forms do not require an email mapping", () => {
    const html = `<form><input name="rating" /></form>`;
    const mapping: ApiFieldMapping = {
      rating: {
        contactPropertyId: "cp_rating",
        contactPropertyType: "custom",
        fieldType: "number",
      },
    };

    const result = validateHtmlFieldMapping(html, mapping, "SURVEY");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("returns valid when HTML, fieldMapping, and SIGN_UP requirements all match", () => {
    const html = `
      <form>
        <input name="email" type="email" />
        <input name="firstName" />
      </form>
    `;
    const mapping: ApiFieldMapping = {
      email: standardEmail,
      firstName: {
        contactPropertyId: "firstName",
        contactPropertyType: "standard",
        fieldType: "string",
      },
    };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("submit/button inputs do not need a mapping and are not flagged as unmapped", () => {
    const html = `
      <form>
        <input name="email" type="email" />
        <input name="submit_btn" type="submit" />
      </form>
    `;
    const mapping: ApiFieldMapping = { email: standardEmail };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");
    expect(result.valid).toBe(true);
  });

  test("collects orphan and unmapped errors together rather than returning the first one only", () => {
    const html = `
      <form>
        <input name="email" />
        <input name="lastName" />
      </form>
    `;
    const mapping: ApiFieldMapping = {
      email: standardEmail,
      ghost: customString,
    };

    const result = validateHtmlFieldMapping(html, mapping, "SIGN_UP");
    expect(result.valid).toBe(false);

    const fields = result.errors.map((e) => e.field).sort();
    expect(fields).toContain("ghost");
    expect(fields).toContain("lastName");
  });
});
