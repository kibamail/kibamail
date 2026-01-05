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
import { clickLogger, logger } from "../logger.js";

export const clickRoute = new Hono();

const FALLBACK_URL = "https://kibamail.com";

clickRoute.get("/:encoded", async (c) => {
  const { encoded } = c.req.param();
  const userAgent = c.req.header("User-Agent");
  const ip = c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP");

  const payload = decodeTrackingPayload(encoded, env.APP_KEY);

  if (!payload || !payload.url) {
    logger.warn({ encoded: encoded.substring(0, 20) }, "Invalid click tracking payload");
    return c.redirect(FALLBACK_URL, 302);
  }

  const log = clickLogger({
    emailSendId: payload.id,
    url: payload.url,
    userAgent,
    ip,
  });

  log.info("Click tracked");

  recordClick({
    emailSendId: payload.id,
    originalUrl: payload.url,
    timestamp: Date.now(),
    userAgent,
    ip,
  }).catch((err) => {
    log.error({ err }, "Failed to record click");
  });

  return c.redirect(payload.url, 302);
});
