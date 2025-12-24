/**
 * Unsubscribe Route
 *
 * Handles unsubscribe requests from email links.
 * Route: GET /u/{contactId}/{broadcastId}
 *
 * For now, redirects to the main app's unsubscribe page.
 * The actual unsubscribe logic is handled by the web app.
 */

import { Hono } from "hono";

export const unsubscribeRoute = new Hono();

// Main app URL for unsubscribe handling
// TODO: Make this configurable via env
const APP_URL = "https://app.kibamail.com";

unsubscribeRoute.get("/:contactId/:broadcastId", async (c) => {
  const { contactId, broadcastId } = c.req.param();

  // Redirect to the main app's unsubscribe page
  const unsubscribeUrl = `${APP_URL}/unsubscribe/${contactId}/${broadcastId}`;

  return c.redirect(unsubscribeUrl, 302);
});

// One-click unsubscribe (POST) for List-Unsubscribe header
unsubscribeRoute.post("/:contactId/:broadcastId", async (c) => {
  const { contactId, broadcastId } = c.req.param();

  // For one-click unsubscribe, we need to process it directly
  // TODO: Implement direct unsubscribe via queue job

  // For now, return success (the job will handle it)
  return c.text("Unsubscribed", 200);
});
