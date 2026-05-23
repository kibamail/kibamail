/**
 * Tests for HTML Path Rewriter
 *
 * Verifies that rewriteRelativePaths converts relative asset URLs to
 * absolute ones while leaving absolute URLs, fragments, and special
 * schemes (mailto, tel, data, blob) untouched.
 */

import { describe, expect, it } from "vitest";
import { rewriteRelativePaths } from "@/lib/forms/path-rewriter";

const BASE = "https://assets.example.com/forms/abc123";

describe("rewriteRelativePaths", () => {
  describe("src attributes", () => {
    it("rewrites relative img src to absolute URL", () => {
      const html = '<img src="logo.png" alt="logo" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`src="${BASE}/logo.png"`);
    });

    it("strips leading ./ from relative paths", () => {
      const html = '<img src="./logo.png" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`src="${BASE}/logo.png"`);
      expect(out).not.toContain("./logo.png");
    });

    it("rewrites nested folder paths", () => {
      const html = '<img src="images/icons/check.svg" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`src="${BASE}/images/icons/check.svg"`);
    });

    it("leaves https:// absolute URLs unchanged", () => {
      const html = '<img src="https://cdn.other.com/a.png" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('src="https://cdn.other.com/a.png"');
      expect(out).not.toContain(BASE);
    });

    it("leaves http:// absolute URLs unchanged", () => {
      const html = '<img src="http://cdn.other.com/a.png" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('src="http://cdn.other.com/a.png"');
    });

    it("leaves protocol-relative URLs unchanged", () => {
      const html = '<img src="//cdn.other.com/a.png" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('src="//cdn.other.com/a.png"');
    });

    it("leaves data: URIs unchanged", () => {
      const html = '<img src="data:image/png;base64,iVBORw0K" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('src="data:image/png;base64,iVBORw0K"');
    });

    it("leaves blob: URIs unchanged", () => {
      const html = '<img src="blob:https://example.com/uuid" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('src="blob:https://example.com/uuid"');
    });

    it("rewrites src on <script> and <video> elements", () => {
      const html =
        '<script src="app.js"></script><video src="intro.mp4"></video>';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`src="${BASE}/app.js"`);
      expect(out).toContain(`src="${BASE}/intro.mp4"`);
    });

    it("rewrites multiple src attributes in one document", () => {
      const html =
        '<img src="a.png" /><img src="b.png" /><img src="https://other/c.png" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`src="${BASE}/a.png"`);
      expect(out).toContain(`src="${BASE}/b.png"`);
      expect(out).toContain('src="https://other/c.png"');
    });
  });

  describe("link href attributes", () => {
    it("rewrites relative stylesheet href", () => {
      const html = '<link rel="stylesheet" href="styles.css" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`href="${BASE}/styles.css"`);
    });

    it("rewrites favicon link href", () => {
      const html = '<link rel="icon" href="favicon.ico" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`href="${BASE}/favicon.ico"`);
    });

    it("does not rewrite href on anchor tags", () => {
      const html = '<a href="page.html">link</a>';
      const out = rewriteRelativePaths(html, BASE);
      // Anchor href is not in the rewriting allowlist.
      expect(out).toContain('href="page.html"');
    });

    it("leaves fragment-only href unchanged on link", () => {
      const html = '<link rel="next" href="#section" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('href="#section"');
    });

    it("leaves mailto: link href unchanged", () => {
      const html = '<link href="mailto:test@example.com" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('href="mailto:test@example.com"');
    });

    it("leaves tel: link href unchanged", () => {
      const html = '<link href="tel:+15555550100" />';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('href="tel:+15555550100"');
    });
  });

  describe("<style> blocks", () => {
    it("rewrites url() references in style blocks", () => {
      const html = '<style>.bg { background: url(bg.png); }</style>';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`url('${BASE}/bg.png')`);
    });

    it("rewrites quoted url() references", () => {
      const html = `<style>.bg { background: url("bg.png"); }</style>`;
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`url('${BASE}/bg.png')`);
    });

    it("rewrites single-quoted url() references", () => {
      const html = `<style>.bg { background: url('bg.png'); }</style>`;
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`url('${BASE}/bg.png')`);
    });

    it("leaves absolute url() unchanged", () => {
      const html =
        '<style>.bg { background: url(https://cdn.other.com/bg.png); }</style>';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain("url('https://cdn.other.com/bg.png')");
      expect(out).not.toContain(`${BASE}/bg.png`);
    });

    it("rewrites multiple url() references in same block", () => {
      const html =
        '<style>.a{background:url(a.png)}.b{background:url(b.png)}</style>';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`url('${BASE}/a.png')`);
      expect(out).toContain(`url('${BASE}/b.png')`);
    });
  });

  describe("inline style attributes", () => {
    it("rewrites url() in inline style attribute", () => {
      const html = '<div style="background: url(hero.jpg);"></div>';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain(`url('${BASE}/hero.jpg')`);
    });

    it("does not modify inline styles without url()", () => {
      const html = '<div style="color: red; font-size: 14px;"></div>';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain('style="color: red; font-size: 14px;"');
    });

    it("leaves data: URLs in inline style unchanged", () => {
      const html =
        '<div style="background: url(data:image/png;base64,abcd);"></div>';
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain("url('data:image/png;base64,abcd')");
    });
  });

  describe("edge cases", () => {
    it("returns valid HTML for empty body", () => {
      const html = "<html><body></body></html>";
      const out = rewriteRelativePaths(html, BASE);
      expect(out).toContain("<html>");
      expect(out).toContain("</html>");
    });

    it("does not crash on empty src attribute", () => {
      const html = '<img src="" />';
      expect(() => rewriteRelativePaths(html, BASE)).not.toThrow();
    });

    it("does not crash on style element with empty contents", () => {
      const html = "<style></style>";
      expect(() => rewriteRelativePaths(html, BASE)).not.toThrow();
    });

    it("does not double-rewrite already-absolute URL", () => {
      const html = `<img src="${BASE}/logo.png" />`;
      const out = rewriteRelativePaths(html, BASE);
      // Absolute URL recognised, left alone — should not contain BASE twice in src
      const matches = out.match(new RegExp(BASE, "g")) || [];
      expect(matches.length).toBe(1);
    });
  });
});
