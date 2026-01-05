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
import { openLogger, logger } from "../logger.js";

export const openRoute = new Hono();

const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

openRoute.get("/:encoded", async (c) => {
  const { encoded } = c.req.param();
  const userAgent = c.req.header("User-Agent");
  const ip = c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP");

  const pixelResponse = c.body(TRACKING_PIXEL, 200, {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });

  const payload = decodeTrackingPayload(encoded, env.APP_KEY);

  if (!payload) {
    logger.warn({ encoded: encoded.substring(0, 20) }, "Invalid open tracking payload");
    return pixelResponse;
  }

  const log = openLogger({
    emailSendId: payload.id,
    userAgent,
    ip,
  });

  log.info("Open tracked");

  recordOpen({
    emailSendId: payload.id,
    timestamp: Date.now(),
    userAgent,
    ip,
  }).catch((err) => {
    log.error({ err }, "Failed to record open");
  });

  return pixelResponse;
});
