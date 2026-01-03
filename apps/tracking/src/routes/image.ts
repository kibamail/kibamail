/**
 * Image Proxy Route
 *
 * Proxies images through the tracking domain for consistent branding.
 * Route: GET /i/{encoded}
 *
 * The encoded payload contains the original image URL, signed with HMAC.
 *
 * IMPORTANT: Images are ALWAYS proxied. There is no fallback - if the proxy
 * cannot fetch the image, the request fails. This ensures:
 * - Consistent branding (all images come from our domain)
 * - Privacy protection (user IP not exposed to external servers)
 * - Security (only signed URLs are proxied)
 */

import { Hono } from "hono";
import { decodeImageUrl } from "@repo/tracking-utils";
import { env } from "../env.js";

export const imageRoute = new Hono();

imageRoute.get("/:encoded", async (c) => {
  const { encoded } = c.req.param();

  const originalUrl = decodeImageUrl(encoded, env.APP_KEY);

  if (!originalUrl) {
    return c.text("Invalid or tampered image URL", 400);
  }

  const response = await fetch(originalUrl, {
    headers: {
      "User-Agent": c.req.header("User-Agent") || "KibamailImageProxy/1.0",
      Accept: c.req.header("Accept") || "image/*",
    },
  });

  if (!response.ok) {
    return c.text(`Upstream error: ${response.status}`, 502);
  }

  const imageBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") || "image/png";

  return c.body(imageBuffer, 200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Proxied-From": new URL(originalUrl).hostname,
  });
});
