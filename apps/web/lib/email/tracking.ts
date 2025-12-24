/**
 * Email Tracking Utilities
 *
 * Provides functions for:
 * - Rewriting links to enable click tracking
 * - Injecting tracking pixels for open tracking
 * - Rewriting image URLs for proxying
 */

import { load as cheerioLoad } from "cheerio";
import type { Element } from "domhandler";
import {
  signData as signDataWithKey,
  encodeTrackingPayload as encodeTrackingPayloadWithKey,
  decodeTrackingPayload as decodeTrackingPayloadWithKey,
  encodeImageUrl as encodeImageUrlWithKey,
  decodeImageUrl as decodeImageUrlWithKey,
  type TrackingPayload,
} from "@repo/tracking-utils";
import { env } from "@/env/schema";

// Re-export types
export type { TrackingPayload };

/**
 * Sign data with the app's secret key
 */
export function signData(data: string): string {
  return signDataWithKey(data, env.APP_KEY);
}

/**
 * Encode a tracking payload with the app's secret key
 */
export function encodeTrackingPayload(
  emailSendId: string,
  originalUrl?: string
): string {
  return encodeTrackingPayloadWithKey(emailSendId, originalUrl, env.APP_KEY);
}

/**
 * Decode and verify a tracking payload with the app's secret key
 */
export function decodeTrackingPayload(
  encoded: string
): TrackingPayload | null {
  return decodeTrackingPayloadWithKey(encoded, env.APP_KEY);
}

/**
 * Encode an image URL with the app's secret key
 */
export function encodeImageUrl(imageUrl: string): string {
  return encodeImageUrlWithKey(imageUrl, env.APP_KEY);
}

/**
 * Decode and verify an image URL with the app's secret key
 */
export function decodeImageUrl(encoded: string): string | null {
  return decodeImageUrlWithKey(encoded, env.APP_KEY);
}

interface RewriteImagesResult {
  html: string;
  images: Array<{ original: string; proxied: string }>;
}

/**
 * Rewrite all image URLs in HTML for proxying through tracking domain
 *
 * Processes <img> tags and replaces src attributes with proxied URLs.
 * Skips data: URLs and tracking pixels (1x1 images).
 *
 * @param html - The HTML content
 * @param trackingDomain - Domain for proxied URLs (e.g., "e.example.com")
 * @returns Modified HTML and list of rewritten images
 */
export function rewriteImageUrls(
  html: string,
  trackingDomain: string
): RewriteImagesResult {
  const $ = cheerioLoad(html);
  const images: Array<{ original: string; proxied: string }> = [];

  $("img").each((_: number, element: Element) => {
    const src = $(element).attr("src");

    if (!src) return;

    // Skip data: URLs (inline images)
    if (src.startsWith("data:")) return;

    // Skip already-proxied URLs
    if (src.includes(`${trackingDomain}/i/`)) return;

    // Skip tracking pixels (our own open tracking)
    if (src.includes(`${trackingDomain}/o/`)) return;

    const encoded = encodeImageUrl(src);
    const proxiedUrl = `https://${trackingDomain}/i/${encoded}`;

    images.push({ original: src, proxied: encoded });

    $(element).attr("src", proxiedUrl);
  });

  return { html: $.html(), images };
}

interface RewriteLinksResult {
  html: string;
  links: Array<{ original: string; tracking: string }>;
}

/**
 * Rewrite all links in HTML for click tracking
 *
 * Processes <a> tags and replaces href attributes with tracking URLs.
 * Respects disable-tracking="true" attribute on links.
 *
 * @param html - The HTML content
 * @param trackingDomain - Domain for tracking URLs (e.g., "e.example.com")
 * @param emailSendId - Unique ID for this email send
 * @returns Modified HTML and list of tracked links
 */
export function rewriteLinks(
  html: string,
  trackingDomain: string,
  emailSendId: string
): RewriteLinksResult {
  const $ = cheerioLoad(html);
  const links: Array<{ original: string; tracking: string }> = [];

  $("a").each((_: number, element: Element) => {
    const href = $(element).attr("href");

    if (!href) return;

    if ($(element).attr("disable-tracking") === "true") {
      return;
    }

    if (href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    if (href.startsWith("#")) {
      return;
    }

    const encodedPayload = encodeTrackingPayload(emailSendId, href);
    const trackingUrl = `https://${trackingDomain}/c/${encodedPayload}`;

    links.push({ original: href, tracking: encodedPayload });

    $(element).attr("href", trackingUrl);
  });

  return { html: $.html(), links };
}

interface InjectPixelResult {
  html: string;
  pixelUrl: string;
}

/**
 * Inject an invisible tracking pixel for open tracking
 *
 * Adds a 1x1 transparent image at the end of the email body.
 * When the recipient's email client loads this image, we can detect the open.
 *
 * @param html - The HTML content
 * @param trackingDomain - Domain for tracking URLs (e.g., "e.example.com")
 * @param emailSendId - Unique ID for this email send
 * @returns Modified HTML with tracking pixel
 */
export function injectTrackingPixel(
  html: string,
  trackingDomain: string,
  emailSendId: string
): InjectPixelResult {
  const encodedPayload = encodeTrackingPayload(emailSendId);
  const pixelUrl = `https://${trackingDomain}/o/${encodedPayload}`;

  const pixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:block;height:1px;width:1px;border:0;" />`;

  let trackedHtml: string;

  // Insert before </body> if present, otherwise append
  if (/<\/body\b/i.test(html)) {
    trackedHtml = html.replace(/<\/body\b/i, (match) => `${pixel}${match}`);
  } else {
    trackedHtml = `${html}${pixel}`;
  }

  return { html: trackedHtml, pixelUrl };
}

/**
 * Apply tracking and image proxying to HTML
 *
 * Applies:
 * - Image proxying (rewrites img src to tracking domain)
 * - Click tracking (rewrites links)
 * - Open tracking (injects pixel)
 *
 * @param html - The HTML content
 * @param trackingDomain - Domain for tracking URLs
 * @param emailSendId - Unique ID for this email send
 * @param options - Which features to enable
 * @returns Tracked HTML and metadata
 */
export function applyTracking(
  html: string,
  trackingDomain: string,
  emailSendId: string,
  options: {
    clickTracking?: boolean;
    openTracking?: boolean;
    imageProxy?: boolean;
  } = {}
): {
  html: string;
  links: Array<{ original: string; tracking: string }>;
  images: Array<{ original: string; proxied: string }>;
  pixelUrl?: string;
} {
  let trackedHtml = html;
  let links: Array<{ original: string; tracking: string }> = [];
  let images: Array<{ original: string; proxied: string }> = [];
  let pixelUrl: string | undefined;

  // Proxy images first (before adding tracking pixel)
  if (options.imageProxy !== false) {
    const imageResult = rewriteImageUrls(trackedHtml, trackingDomain);
    trackedHtml = imageResult.html;
    images = imageResult.images;
  }

  if (options.clickTracking !== false) {
    const linkResult = rewriteLinks(trackedHtml, trackingDomain, emailSendId);
    trackedHtml = linkResult.html;
    links = linkResult.links;
  }

  if (options.openTracking !== false) {
    const pixelResult = injectTrackingPixel(
      trackedHtml,
      trackingDomain,
      emailSendId
    );
    trackedHtml = pixelResult.html;
    pixelUrl = pixelResult.pixelUrl;
  }

  return { html: trackedHtml, links, images, pixelUrl };
}
