/**
 * Click Tracking Route
 *
 * Redirects to the original URL and records link clicks.
 * Route: GET /c/{encoded}
 *
 * The encoded payload contains the email send ID and original URL, signed with HMAC.
 */

import { Hono } from "hono";
import { decodeTrackingPayload } from "@repo/tracking-utils";
import { env } from "../env.js";
import { recordClick } from "../queue.js";

export const clickRoute = new Hono();

// Fallback URL if decoding fails
const FALLBACK_URL = "https://kibamail.com";

clickRoute.get("/:encoded", async (c) => {
  const { encoded } = c.req.param();

  // Decode and verify the payload
  const payload = decodeTrackingPayload(encoded, env.APP_KEY);

  if (!payload || !payload.url) {
    // Invalid or tampered payload - redirect to fallback
    return c.redirect(FALLBACK_URL, 302);
  }

  // Record the click event asynchronously (don't block redirect)
  recordClick({
    emailSendId: payload.id,
    originalUrl: payload.url,
    timestamp: Date.now(),
    userAgent: c.req.header("User-Agent"),
    ip: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP"),
  }).catch((err) => {
    console.error("Failed to record click:", err);
  });

  // Redirect to the original URL
  return c.redirect(payload.url, 302);
});
