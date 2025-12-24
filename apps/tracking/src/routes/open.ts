/**
 * Open Tracking Route
 *
 * Serves a 1x1 transparent tracking pixel and records email opens.
 * Route: GET /o/{encoded}
 *
 * The encoded payload contains the email send ID, signed with HMAC.
 */

import { Hono } from "hono";
import { decodeTrackingPayload } from "@repo/tracking-utils";
import { env } from "../env.js";
import { recordOpen } from "../queue.js";

export const openRoute = new Hono();

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

openRoute.get("/:encoded", async (c) => {
  const { encoded } = c.req.param();

  // Always return the pixel first (don't block on tracking)
  const pixelResponse = c.body(TRACKING_PIXEL, 200, {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });

  // Decode and verify the payload
  const payload = decodeTrackingPayload(encoded, env.APP_KEY);

  if (payload) {
    // Record the open event asynchronously
    recordOpen({
      emailSendId: payload.id,
      timestamp: Date.now(),
      userAgent: c.req.header("User-Agent"),
      ip: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP"),
    }).catch((err) => {
      console.error("Failed to record open:", err);
    });
  }

  return pixelResponse;
});
