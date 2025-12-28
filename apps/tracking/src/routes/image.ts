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

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

imageRoute.get("/:encoded", async (c) => {
  const { encoded } = c.req.param();

  const originalUrl = decodeImageUrl(encoded, env.APP_KEY);

  if (!originalUrl) {
    return c.body(TRANSPARENT_GIF, 200, {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=31536000",
    });
  }

  try {
    const response = await fetch(originalUrl, {
      headers: {
        "User-Agent": c.req.header("User-Agent") || "KibamailImageProxy/1.0",
        Accept: c.req.header("Accept") || "image/*",
      },
    });

    if (!response.ok) {
      return c.body(TRANSPARENT_GIF, 200, {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=300",
      });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/png";

    return c.body(imageBuffer, 200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Proxied-From": new URL(originalUrl).hostname,
    });
  } catch (error) {
    console.error("Image proxy error:", error);

    return c.body(TRANSPARENT_GIF, 200, {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=300",
    });
  }
});
