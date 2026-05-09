/**
 * Tests for forms/html-renderer
 *
 * After a form submission, the server redirects back to the form page with
 * state encoded in query params. renderFormHtml is responsible for showing
 * the right success/error markup and repopulating values without trusting
 * the user-supplied HTML to be well-behaved. Mistakes here either lose user
 * input across redirects or leak unrelated form state, so it's worth
 * pinning down the contract.
 */

import { describe, expect, test } from "vitest";
import { renderFormHtml } from "@/lib/forms/html-renderer";
import * as cheerio from "cheerio";

const BASE_HTML = `
  <form>
    <input name="email" type="email" />
    <input name="firstName" />
    <input name="newsletter" type="checkbox" value="yes" />
    <input name="plan" type="radio" value="basic" />
    <input name="plan" type="radio" value="pro" />
    <select name="country">
      <option value="US">US</option>
      <option value="UK">UK</option>
    </select>
    <textarea name="bio"></textarea>
    <span data-kibamail-error="email" hidden></span>
    <span data-kibamail-error="firstName" hidden></span>
    <div data-kibamail-error-summary hidden>
      <span data-kibamail-error-message></span>
    </div>
    <div data-kibamail-success hidden>Thanks!</div>
  </form>
`;

describe("renderFormHtml", () => {
  test("returns the html unchanged when state has no status", () => {
    const html = "<form><input name=\"email\" /></form>";
    expect(renderFormHtml(html, {})).toBe(html);
  });

  describe("success state", () => {
    test("hides the form and reveals the success message", () => {
      const out = renderFormHtml(BASE_HTML, { status: "success" });
      const $ = cheerio.load(out);

      expect($("form").attr("hidden")).toBeDefined();
      expect($("[data-kibamail-success]").attr("hidden")).toBeUndefined();
    });

    test("ignores values/errors when status is success", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "success",
        errors: { email: "Bad email" },
        values: { email: "user@example.com" },
      });
      const $ = cheerio.load(out);

      expect($("[data-kibamail-error=\"email\"]").attr("hidden")).toBeDefined();
      expect($("input[name=\"email\"]").attr("value")).toBeUndefined();
    });
  });

  describe("error state — field errors", () => {
    test("writes the error text and unhides the matching error element", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "error",
        errors: { email: "Email is required" },
      });
      const $ = cheerio.load(out);

      const emailErr = $("[data-kibamail-error=\"email\"]");
      expect(emailErr.text()).toBe("Email is required");
      expect(emailErr.attr("hidden")).toBeUndefined();
    });

    test("leaves errors for fields with no matching element alone (no throw)", () => {
      expect(() =>
        renderFormHtml(BASE_HTML, {
          status: "error",
          errors: { unknownField: "boom" },
        }),
      ).not.toThrow();
    });

    test("does not unhide unrelated error elements", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "error",
        errors: { email: "Required" },
      });
      const $ = cheerio.load(out);

      expect($("[data-kibamail-error=\"firstName\"]").attr("hidden"))
        .toBeDefined();
    });

    test("escapes HTML in the error text rather than injecting raw markup", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "error",
        errors: { email: "<script>alert('x')</script>" },
      });
      const $ = cheerio.load(out);

      const emailErr = $("[data-kibamail-error=\"email\"]");
      expect(emailErr.html()).not.toContain("<script>");
      expect(emailErr.text()).toBe("<script>alert('x')</script>");
    });
  });

  describe("error state — server message", () => {
    test("unhides the summary container and writes the message", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "error",
        message: "Something went wrong",
      });
      const $ = cheerio.load(out);

      expect($("[data-kibamail-error-summary]").attr("hidden")).toBeUndefined();
      expect($("[data-kibamail-error-message]").text()).toBe(
        "Something went wrong",
      );
    });
  });

  describe("error state — value repopulation", () => {
    test("sets the value attribute on text-style inputs", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "error",
        values: { email: "user@example.com", firstName: "Ada" },
      });
      const $ = cheerio.load(out);

      expect($("input[name=\"email\"]").attr("value")).toBe("user@example.com");
      expect($("input[name=\"firstName\"]").attr("value")).toBe("Ada");
    });

    test("checks a checkbox when its value matches and leaves it unchecked otherwise", () => {
      const matched = renderFormHtml(BASE_HTML, {
        status: "error",
        values: { newsletter: "yes" },
      });
      const $matched = cheerio.load(matched);
      expect(
        $matched("input[name=\"newsletter\"]").attr("checked"),
      ).toBeDefined();

      const unmatched = renderFormHtml(BASE_HTML, {
        status: "error",
        values: { newsletter: "no" },
      });
      const $unmatched = cheerio.load(unmatched);
      expect(
        $unmatched("input[name=\"newsletter\"]").attr("checked"),
      ).toBeUndefined();
    });

    test("checks the matching radio in a group and not the others", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "error",
        values: { plan: "pro" },
      });
      const $ = cheerio.load(out);

      const checked = $("input[name=\"plan\"][value=\"pro\"]");
      const unchecked = $("input[name=\"plan\"][value=\"basic\"]");
      expect(checked.attr("checked")).toBeDefined();
      expect(unchecked.attr("checked")).toBeUndefined();
    });

    test("removes a previously selected radio when the value no longer matches", () => {
      const html = `
        <form>
          <input type="radio" name="plan" value="basic" checked />
          <input type="radio" name="plan" value="pro" />
        </form>
      `;
      const out = renderFormHtml(html, {
        status: "error",
        values: { plan: "pro" },
      });
      const $ = cheerio.load(out);

      expect($("input[name=\"plan\"][value=\"basic\"]").attr("checked"))
        .toBeUndefined();
      expect($("input[name=\"plan\"][value=\"pro\"]").attr("checked"))
        .toBeDefined();
    });

    test("repopulates select by setting selected on the matching option only", () => {
      const html = `
        <form>
          <select name="country">
            <option value="US" selected>US</option>
            <option value="UK">UK</option>
          </select>
        </form>
      `;
      const out = renderFormHtml(html, {
        status: "error",
        values: { country: "UK" },
      });
      const $ = cheerio.load(out);

      expect($("select[name=\"country\"] option[value=\"US\"]")
        .attr("selected")).toBeUndefined();
      expect($("select[name=\"country\"] option[value=\"UK\"]")
        .attr("selected")).toBeDefined();
    });

    test("repopulates a textarea by setting its inner text", () => {
      const out = renderFormHtml(BASE_HTML, {
        status: "error",
        values: { bio: "Hello\nWorld" },
      });
      const $ = cheerio.load(out);

      expect($("textarea[name=\"bio\"]").text()).toBe("Hello\nWorld");
    });

    test("ignores values that target inputs outside the <form>", () => {
      const html = `
        <input name="rogue" />
        <form><input name="email" /></form>
      `;
      const out = renderFormHtml(html, {
        status: "error",
        values: { rogue: "x", email: "user@example.com" },
      });
      const $ = cheerio.load(out);

      expect($("input[name=\"rogue\"]").attr("value")).toBeUndefined();
      expect($("form input[name=\"email\"]").attr("value")).toBe(
        "user@example.com",
      );
    });
  });

  test("error state combines field errors, server message, and value repopulation", () => {
    const out = renderFormHtml(BASE_HTML, {
      status: "error",
      errors: { email: "Required" },
      message: "Please fix the errors below",
      values: { firstName: "Ada" },
    });
    const $ = cheerio.load(out);

    expect($("[data-kibamail-error=\"email\"]").text()).toBe("Required");
    expect($("[data-kibamail-error-message]").text()).toBe(
      "Please fix the errors below",
    );
    expect($("input[name=\"firstName\"]").attr("value")).toBe("Ada");
    expect($("[data-kibamail-success]").attr("hidden")).toBeDefined();
    expect($("form").attr("hidden")).toBeUndefined();
  });
});
