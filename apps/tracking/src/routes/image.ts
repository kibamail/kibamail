/**
 * Image Proxy Route
 *
 * Proxies images through the tracking domain for consistent branding.
 * Route: GET /i/{encoded}
 *
 * The encoded payload contains the original image URL, signed with HMAC.
 */

import { Hono } from "hono";
import { decodeImageUrl } from "@repo/tracking-utils";
import { env } from "../env.js";

export const imageRoute = new Hono();

// 1x1 transparent GIF for fallback
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

imageRoute.get("/:encoded", async (c) => {
  const { encoded } = c.req.param();

  // Decode and verify the image URL
  const originalUrl = decodeImageUrl(encoded, env.APP_KEY);

  if (!originalUrl) {
    // Return transparent GIF for invalid/tampered URLs
    return c.body(TRANSPARENT_GIF, 200, {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=31536000",
    });
  }

  try {
    // Fetch the original image
    const response = await fetch(originalUrl, {
      headers: {
        // Pass through some headers for better compatibility
        "User-Agent": c.req.header("User-Agent") || "KibamailImageProxy/1.0",
        Accept: c.req.header("Accept") || "image/*",
      },
    });

    if (!response.ok) {
      // Return transparent GIF if original image fails
      return c.body(TRANSPARENT_GIF, 200, {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=300",
      });
    }

    // Get the image content
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/png";

    // Return the proxied image with caching headers
    return c.body(imageBuffer, 200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Proxied-From": new URL(originalUrl).hostname,
    });
  } catch (error) {
    console.error("Image proxy error:", error);

    // Return transparent GIF on fetch errors
    return c.body(TRANSPARENT_GIF, 200, {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=300",
    });
  }
});
