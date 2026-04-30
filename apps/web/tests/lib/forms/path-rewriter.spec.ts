/**
 * Tests for the form HTML path rewriter at lib/forms/path-rewriter.ts.
 *
 * This is the only thing that converts user-uploaded relative asset paths
 * (`./logo.png`, `images/icon.svg`) into the absolute S3 URLs that get
 * served from the form deploy endpoint. Bugs here either:
 *   - Mangle absolute URLs (e.g. accidentally prepend the base URL to
 *     `https://...`, breaking external CDN images), or
 *   - Skip URL types that should be preserved (`mailto:`, `tel:`, `data:`,
 *     `#anchor`), creating broken links/forms in production.
 *
 * Tests cover each absolute-URL guard and each rewrite target (src, link
 * href, <style> blocks, inline style url(...)).
 */

import { describe, expect, test } from "vitest";
import { rewriteRelativePaths } from "@/lib/forms/path-rewriter";

const BASE = "https://cdn.example.com/forms/abc";

describe("rewriteRelativePaths — src attributes", () => {
  test("rewrites a bare relative src on <img>", () => {
    const html = `<img src="logo.png">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="${BASE}/logo.png"`);
  });

  test("strips a leading ./ from relative src", () => {
    const html = `<img src="./logo.png">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="${BASE}/logo.png"`);
    expect(out).not.toContain("./logo.png");
  });

  test("rewrites src on <script>, <video>, and <source>", () => {
    const html = `
      <script src="app.js"></script>
      <video src="movie.mp4"></video>
      <source src="audio.mp3">
    `;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="${BASE}/app.js"`);
    expect(out).toContain(`src="${BASE}/movie.mp4"`);
    expect(out).toContain(`src="${BASE}/audio.mp3"`);
  });

  test("leaves https:// absolute src unchanged", () => {
    const html = `<img src="https://other.cdn/logo.png">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="https://other.cdn/logo.png"`);
    expect(out).not.toContain(BASE);
  });

  test("leaves http:// absolute src unchanged", () => {
    const html = `<img src="http://insecure.example/x.png">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="http://insecure.example/x.png"`);
  });

  test("leaves protocol-relative // src unchanged", () => {
    const html = `<img src="//cdn.example/x.png">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="//cdn.example/x.png"`);
  });

  test("leaves data: URIs unchanged (inline images)", () => {
    const dataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const html = `<img src="${dataUri}">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="${dataUri}"`);
  });

  test("leaves blob: src unchanged", () => {
    const html = `<img src="blob:abc-123">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`src="blob:abc-123"`);
  });
});

describe("rewriteRelativePaths — link href", () => {
  test("rewrites relative <link> stylesheet href", () => {
    const html = `<link rel="stylesheet" href="styles/main.css">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`href="${BASE}/styles/main.css"`);
  });

  test("rewrites favicon link href", () => {
    const html = `<link rel="icon" href="favicon.ico">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`href="${BASE}/favicon.ico"`);
  });

  test("does NOT rewrite <a> href (only <link> elements)", () => {
    // Nav links are not assets; rewriting them would silently break
    // form-internal navigation.
    const html = `<a href="thank-you.html">Done</a>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`href="thank-you.html"`);
    expect(out).not.toContain(`${BASE}/thank-you.html`);
  });

  test("leaves mailto: link href untouched", () => {
    const html = `<link href="mailto:hello@example.com">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`href="mailto:hello@example.com"`);
  });

  test("leaves tel: link href untouched", () => {
    const html = `<link href="tel:+15550100">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`href="tel:+15550100"`);
  });

  test("leaves #fragment link href untouched", () => {
    const html = `<link href="#section">`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`href="#section"`);
  });
});

describe("rewriteRelativePaths — <style> blocks", () => {
  test("rewrites a single url() reference in <style>", () => {
    const html = `<style>.bg { background: url(images/bg.png); }</style>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`url('${BASE}/images/bg.png')`);
  });

  test("rewrites multiple url() references in one <style>", () => {
    const html = `<style>
      .a { background: url("a.png"); }
      .b { background: url('b.png'); }
      .c { background: url(c.png); }
    </style>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`url('${BASE}/a.png')`);
    expect(out).toContain(`url('${BASE}/b.png')`);
    expect(out).toContain(`url('${BASE}/c.png')`);
  });

  test("leaves absolute url() unchanged in <style>", () => {
    const html = `<style>.x { background: url(https://other.cdn/x.png); }</style>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`url('https://other.cdn/x.png')`);
    expect(out).not.toContain(`${BASE}/https`);
  });

  test("leaves data: url() unchanged in <style>", () => {
    const html = `<style>.x { background: url(data:image/svg+xml;base64,Zm9v); }</style>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`url('data:image/svg+xml;base64,Zm9v')`);
  });

  test("handles whitespace inside url(...)", () => {
    const html = `<style>.x { background: url(   spaced.png   ); }</style>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`url('${BASE}/spaced.png')`);
  });
});

describe("rewriteRelativePaths — inline style attributes", () => {
  test("rewrites url() in style attribute", () => {
    const html = `<div style="background: url(hero.jpg);"></div>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`url('${BASE}/hero.jpg')`);
  });

  test("leaves style attributes without url() untouched", () => {
    // Optimization guard: rewriter should skip the url() pass entirely
    // when the style has no url(. Verify the original style survives.
    const html = `<div style="color: red; font-size: 14px;"></div>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`color: red; font-size: 14px`);
  });

  test("does not double-rewrite an already-absolute url() in style attribute", () => {
    const html = `<div style="background: url(https://x/y.png);"></div>`;
    const out = rewriteRelativePaths(html, BASE);
    expect(out).toContain(`url('https://x/y.png')`);
    expect(out).not.toContain(`${BASE}/https`);
  });
});

describe("rewriteRelativePaths — empty/edge inputs", () => {
  test("returns empty body for empty html input", () => {
    // cheerio wraps even empty input in <html><head><body>...
    // We just need to make sure it doesn't throw and returns a string.
    const out = rewriteRelativePaths("", BASE);
    expect(typeof out).toBe("string");
  });

  test("treats src='' (empty) as a no-op (rewriteUrl bails on falsy)", () => {
    const html = `<img src="">`;
    const out = rewriteRelativePaths(html, BASE);
    // Empty src should not get the base URL appended.
    expect(out).not.toContain(`src="${BASE}/"`);
  });
});
