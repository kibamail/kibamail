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
 *
 * This server lives at e.kbmta.net. Users point their tracking subdomain
 * (e.g., e.example.com) as a CNAME to this domain.
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { env } from "./env.js";
import { imageRoute } from "./routes/image.js";
import { openRoute } from "./routes/open.js";
import { clickRoute } from "./routes/click.js";
import { unsubscribeRoute } from "./routes/unsubscribe.js";

const app = new Hono();

// Request logging
app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount routes
app.route("/i", imageRoute);
app.route("/o", openRoute);
app.route("/c", clickRoute);
app.route("/u", unsubscribeRoute);

// 404 handler
app.notFound((c) => {
  return c.text("Not Found", 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.text("Internal Server Error", 500);
});

// Start server
const port = env.PORT;

console.log(`Tracking server starting on http://localhost:${port}`);
console.log(`Routes:`);
console.log(`  - GET /i/{encoded} - Image proxy`);
console.log(`  - GET /o/{encoded} - Open tracking pixel`);
console.log(`  - GET /c/{encoded} - Click tracking redirect`);
console.log(`  - GET /u/{contactId}/{broadcastId} - Unsubscribe`);

serve({
  fetch: app.fetch,
  port,
});
