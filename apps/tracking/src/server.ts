/**
 * Tracking Server
 *
 * Handles email tracking and asset serving:
 * - /i/{encoded} - Image proxy (serves images through tracking domain)
 * - /o/{encoded} - Open tracking (1x1 pixel, records email opens)
 * - /c/{encoded} - Click tracking (redirects to original URL, records clicks)
 * - /u/{contactId}/{broadcastId} - Unsubscribe handling
 * - /p/{contactId} - Preferences page
 * - /v/{broadcastId}/{contactId} - View in browser
 * - /confirm/{formId}/{token} - Double opt-in confirmation
 *
 * This server lives at e.kbmta.net. Users point their tracking subdomain
 * (e.g., e.example.com) as a CNAME to this domain.
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { imageRoute } from "./routes/image.js";
import { openRoute } from "./routes/open.js";
import { clickRoute } from "./routes/click.js";
import { unsubscribeRoute, unsubscribeBySendingIdRoute } from "./routes/unsubscribe.js";
import { confirmRoute } from "./routes/confirm.js";
import { acmeChallengeRoute } from "./routes/acme-challenge.js";

const app = new Hono();

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  // Skip logging for health checks
  if (c.req.path === "/health") return;

  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    userAgent: c.req.header("User-Agent"),
    ip: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP"),
    host: c.req.header("Host"),
  });
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount routes
app.route("/i", imageRoute);
app.route("/o", openRoute);
app.route("/c", clickRoute);
app.route("/u", unsubscribeRoute);
app.route("/us", unsubscribeBySendingIdRoute); // SendingId-based unsubscribe for email-only sends
app.route("/confirm", confirmRoute);
app.route("/.well-known/acme-challenge", acmeChallengeRoute);

// 404 handler
app.notFound((c) => {
  return c.text("Not Found", 404);
});

// Error handler
app.onError((err, c) => {
  logger.error({ err, path: c.req.path, method: c.req.method }, "Server error");
  return c.text("Internal Server Error", 500);
});

// Start server
const port = env.PORT;

logger.info({ port }, "Tracking server starting");
logger.info(
  {
    routes: [
      "GET /i/{encoded} - Image proxy",
      "GET /o/{encoded} - Open tracking pixel",
      "GET /c/{encoded} - Click tracking redirect",
      "GET /u/{contactId}/{broadcastId} - Unsubscribe (contact-based)",
      "GET /us/{sendingId} - Unsubscribe (sendingId-based, email-only sends)",
      "GET /confirm/{formId}/{token} - Double opt-in confirmation",
      "GET /.well-known/acme-challenge/{token} - ACME HTTP-01 challenge",
    ],
  },
  "Available routes"
);

serve({
  fetch: app.fetch,
  port,
});
