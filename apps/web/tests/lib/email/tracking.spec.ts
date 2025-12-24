/**
 * Tests for Email Tracking Utilities
 *
 * Tests link rewriting, tracking pixel injection, image proxying, and URL signing.
 */

import { describe, expect, test } from "vitest";
import {
  signData,
  encodeTrackingPayload,
  decodeTrackingPayload,
  encodeImageUrl,
  decodeImageUrl,
  rewriteLinks,
  rewriteImageUrls,
  injectTrackingPixel,
  applyTracking,
} from "@/lib/email/tracking";

describe("signData", () => {
  test("should produce consistent signatures for same data", () => {
    const data = "test-data";
    const sig1 = signData(data);
    const sig2 = signData(data);
    expect(sig1).toBe(sig2);
  });

  test("should produce different signatures for different data", () => {
    const sig1 = signData("data-1");
    const sig2 = signData("data-2");
    expect(sig1).not.toBe(sig2);
  });

  test("should return base64url encoded string", () => {
    const sig = signData("test");
    // Base64url uses only alphanumeric, -, and _
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("encodeTrackingPayload / decodeTrackingPayload", () => {
  test("should encode and decode email send ID", () => {
    const emailSendId = "es_abc123_def456";
    const encoded = encodeTrackingPayload(emailSendId);
    const decoded = decodeTrackingPayload(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(emailSendId);
    expect(decoded?.url).toBeUndefined();
  });

  test("should encode and decode email send ID with URL", () => {
    const emailSendId = "es_xyz789";
    const originalUrl = "https://example.com/page?foo=bar";
    const encoded = encodeTrackingPayload(emailSendId, originalUrl);
    const decoded = decodeTrackingPayload(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(emailSendId);
    expect(decoded?.url).toBe(originalUrl);
  });

  test("should return null for tampered payload", () => {
    const encoded = encodeTrackingPayload("es_test123");
    // Tamper with the signature
    const parts = encoded.split(".");
    const tampered = `${parts[0]}.invalidSignature`;

    const decoded = decodeTrackingPayload(tampered);
    expect(decoded).toBeNull();
  });

  test("should return null for invalid format", () => {
    expect(decodeTrackingPayload("invalid")).toBeNull();
    expect(decodeTrackingPayload("")).toBeNull();
    expect(decodeTrackingPayload("a.b.c")).toBeNull();
  });
});

describe("encodeImageUrl / decodeImageUrl", () => {
  test("should encode and decode image URL", () => {
    const imageUrl = "https://cdn.example.com/images/hero.png";
    const encoded = encodeImageUrl(imageUrl);
    const decoded = decodeImageUrl(encoded);

    expect(decoded).toBe(imageUrl);
  });

  test("should handle URLs with query parameters", () => {
    const imageUrl = "https://cdn.example.com/image.png?w=800&h=600&format=webp";
    const encoded = encodeImageUrl(imageUrl);
    const decoded = decodeImageUrl(encoded);

    expect(decoded).toBe(imageUrl);
  });

  test("should handle long S3 URLs", () => {
    const imageUrl = "https://kibamail-assets.s3.us-east-1.amazonaws.com/workspaces/ws_abc123/broadcasts/br_def456/images/hero-banner.png";
    const encoded = encodeImageUrl(imageUrl);
    const decoded = decodeImageUrl(encoded);

    expect(decoded).toBe(imageUrl);
    // Verify it's reasonably sized (URL + base64 overhead + signature)
    expect(encoded.length).toBeLessThan(250);
  });

  test("should return null for tampered payload", () => {
    const encoded = encodeImageUrl("https://example.com/image.png");
    const parts = encoded.split(".");
    const tampered = `${parts[0]}.invalidSignature`;

    expect(decodeImageUrl(tampered)).toBeNull();
  });

  test("should return null for invalid format", () => {
    expect(decodeImageUrl("invalid")).toBeNull();
    expect(decodeImageUrl("")).toBeNull();
    expect(decodeImageUrl("a.b.c")).toBeNull();
  });

  test("should produce consistent encoding for same URL", () => {
    const imageUrl = "https://example.com/image.png";
    const encoded1 = encodeImageUrl(imageUrl);
    const encoded2 = encodeImageUrl(imageUrl);

    expect(encoded1).toBe(encoded2);
  });
});

describe("rewriteImageUrls", () => {
  test("should rewrite image src attributes", () => {
    const html = '<img src="https://cdn.example.com/hero.png" alt="Hero">';
    const result = rewriteImageUrls(html, "e.track.com");

    expect(result.html).toContain("https://e.track.com/i/");
    expect(result.html).not.toContain("https://cdn.example.com/hero.png");
    expect(result.images.length).toBe(1);
    expect(result.images[0].original).toBe("https://cdn.example.com/hero.png");
  });

  test("should skip data: URLs", () => {
    const html = '<img src="data:image/png;base64,iVBORw0KGgo..." alt="Inline">';
    const result = rewriteImageUrls(html, "e.track.com");

    expect(result.html).toContain("data:image/png;base64");
    expect(result.images.length).toBe(0);
  });

  test("should skip already-proxied images", () => {
    const html = '<img src="https://e.track.com/i/abc123.xyz" alt="Proxied">';
    const result = rewriteImageUrls(html, "e.track.com");

    expect(result.html).toContain("https://e.track.com/i/abc123.xyz");
    expect(result.images.length).toBe(0);
  });

  test("should skip tracking pixels", () => {
    const html = '<img src="https://e.track.com/o/abc123.xyz" width="1" height="1">';
    const result = rewriteImageUrls(html, "e.track.com");

    expect(result.html).toContain("https://e.track.com/o/abc123.xyz");
    expect(result.images.length).toBe(0);
  });

  test("should rewrite multiple images", () => {
    const html = `
      <img src="https://cdn.example.com/one.png">
      <img src="https://cdn.example.com/two.png">
      <img src="https://cdn.example.com/three.png">
    `;
    const result = rewriteImageUrls(html, "e.track.com");

    expect(result.images.length).toBe(3);
    expect(result.images.map((i) => i.original)).toContain("https://cdn.example.com/one.png");
    expect(result.images.map((i) => i.original)).toContain("https://cdn.example.com/two.png");
    expect(result.images.map((i) => i.original)).toContain("https://cdn.example.com/three.png");
  });

  test("should handle images without src", () => {
    const html = '<img alt="No source">';
    const result = rewriteImageUrls(html, "e.track.com");

    expect(result.images.length).toBe(0);
  });

  test("should preserve other image attributes", () => {
    const html = '<img src="https://cdn.example.com/hero.png" alt="Hero" width="800" height="600" class="hero-image">';
    const result = rewriteImageUrls(html, "e.track.com");

    expect(result.html).toContain('alt="Hero"');
    expect(result.html).toContain('width="800"');
    expect(result.html).toContain('height="600"');
    expect(result.html).toContain('class="hero-image"');
  });
});

describe("rewriteLinks", () => {
  test("should rewrite http/https links", () => {
    const html = '<a href="https://example.com/page">Link</a>';
    const result = rewriteLinks(html, "e.track.com", "es_test");

    expect(result.html).toContain("https://e.track.com/c/");
    expect(result.html).not.toContain("https://example.com/page");
    expect(result.links.length).toBe(1);
    expect(result.links[0].original).toBe("https://example.com/page");
  });

  test("should skip mailto links", () => {
    const html = '<a href="mailto:test@example.com">Email</a>';
    const result = rewriteLinks(html, "e.track.com", "es_test");

    expect(result.html).toContain("mailto:test@example.com");
    expect(result.links.length).toBe(0);
  });

  test("should skip tel links", () => {
    const html = '<a href="tel:+1234567890">Call</a>';
    const result = rewriteLinks(html, "e.track.com", "es_test");

    expect(result.html).toContain("tel:+1234567890");
    expect(result.links.length).toBe(0);
  });

  test("should skip anchor links", () => {
    const html = '<a href="#section">Jump</a>';
    const result = rewriteLinks(html, "e.track.com", "es_test");

    expect(result.html).toContain('href="#section"');
    expect(result.links.length).toBe(0);
  });

  test("should respect disable-tracking attribute", () => {
    const html = '<a href="https://example.com" disable-tracking="true">Link</a>';
    const result = rewriteLinks(html, "e.track.com", "es_test");

    expect(result.html).toContain("https://example.com");
    expect(result.html).not.toContain("e.track.com");
    expect(result.links.length).toBe(0);
  });

  test("should rewrite multiple links", () => {
    const html = `
      <a href="https://one.com">One</a>
      <a href="https://two.com">Two</a>
      <a href="https://three.com">Three</a>
    `;
    const result = rewriteLinks(html, "e.track.com", "es_test");

    expect(result.links.length).toBe(3);
    expect(result.links.map((l) => l.original)).toContain("https://one.com");
    expect(result.links.map((l) => l.original)).toContain("https://two.com");
    expect(result.links.map((l) => l.original)).toContain("https://three.com");
  });

  test("should handle links without href", () => {
    const html = '<a name="anchor">Named anchor</a>';
    const result = rewriteLinks(html, "e.track.com", "es_test");

    expect(result.links.length).toBe(0);
  });
});

describe("injectTrackingPixel", () => {
  test("should inject pixel before </body>", () => {
    const html = "<html><body><p>Content</p></body></html>";
    const result = injectTrackingPixel(html, "e.track.com", "es_test");

    expect(result.html).toContain('src="https://e.track.com/o/');
    expect(result.html).toContain('width="1"');
    expect(result.html).toContain('height="1"');
    expect(result.html.indexOf("<img")).toBeLessThan(result.html.indexOf("</body>"));
  });

  test("should append pixel when no </body> tag", () => {
    const html = "<p>Content</p>";
    const result = injectTrackingPixel(html, "e.track.com", "es_test");

    expect(result.html).toContain('src="https://e.track.com/o/');
    expect(result.html).toContain("<p>Content</p>");
  });

  test("should return pixel URL", () => {
    const html = "<p>Test</p>";
    const result = injectTrackingPixel(html, "e.track.com", "es_test");

    expect(result.pixelUrl).toMatch(/^https:\/\/e\.track\.com\/o\/[A-Za-z0-9_=-]+\.[A-Za-z0-9_-]+$/);
  });
});

describe("applyTracking", () => {
  test("should apply image proxy, click tracking, and open tracking by default", () => {
    const html = '<body><img src="https://cdn.example.com/hero.png"><a href="https://example.com">Link</a></body>';
    const result = applyTracking(html, "e.track.com", "es_test");

    // Image proxy
    expect(result.html).toContain("https://e.track.com/i/");
    expect(result.images.length).toBe(1);

    // Click tracking
    expect(result.html).toContain("https://e.track.com/c/");
    expect(result.links.length).toBe(1);

    // Open tracking
    expect(result.html).toContain("https://e.track.com/o/");
    expect(result.pixelUrl).toBeDefined();
  });

  test("should skip image proxy when disabled", () => {
    const html = '<img src="https://cdn.example.com/hero.png">';
    const result = applyTracking(html, "e.track.com", "es_test", {
      imageProxy: false,
    });

    expect(result.html).toContain("https://cdn.example.com/hero.png");
    expect(result.html).not.toContain("https://e.track.com/i/");
    expect(result.images.length).toBe(0);
  });

  test("should skip click tracking when disabled", () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = applyTracking(html, "e.track.com", "es_test", {
      clickTracking: false,
    });

    expect(result.html).toContain("https://example.com");
    expect(result.html).not.toContain("https://e.track.com/c/");
    expect(result.links.length).toBe(0);
    // Open tracking should still work
    expect(result.pixelUrl).toBeDefined();
  });

  test("should skip open tracking when disabled", () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = applyTracking(html, "e.track.com", "es_test", {
      openTracking: false,
    });

    // Click tracking should still work
    expect(result.html).toContain("https://e.track.com/c/");
    expect(result.links.length).toBe(1);
    // No pixel
    expect(result.pixelUrl).toBeUndefined();
    expect(result.html).not.toContain("https://e.track.com/o/");
  });

  test("should skip all tracking when disabled", () => {
    const html = '<img src="https://cdn.example.com/hero.png"><a href="https://example.com">Link</a>';
    const result = applyTracking(html, "e.track.com", "es_test", {
      imageProxy: false,
      clickTracking: false,
      openTracking: false,
    });

    expect(result.html).toContain("https://cdn.example.com/hero.png");
    expect(result.html).toContain("https://example.com");
    expect(result.html).not.toContain("e.track.com");
    expect(result.images.length).toBe(0);
    expect(result.links.length).toBe(0);
    expect(result.pixelUrl).toBeUndefined();
  });

  test("should not proxy the injected tracking pixel", () => {
    const html = '<body><img src="https://cdn.example.com/hero.png"></body>';
    const result = applyTracking(html, "e.track.com", "es_test");

    // Should have 1 proxied image (hero.png) and 1 tracking pixel
    expect(result.images.length).toBe(1);
    expect(result.images[0].original).toBe("https://cdn.example.com/hero.png");

    // The tracking pixel should exist but not be in the images array
    expect(result.html).toContain("https://e.track.com/o/");
    expect(result.pixelUrl).toBeDefined();
  });
});
