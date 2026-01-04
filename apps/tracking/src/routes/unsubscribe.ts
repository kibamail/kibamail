/**
 * Unsubscribe Route
 *
 * Handles unsubscribe requests from email links.
 *
 * Routes:
 * - GET /u/{contactId}/{broadcastId} - Manual unsubscribe link click
 * - POST /u/{contactId}/{broadcastId} - RFC 8058 one-click unsubscribe
 *
 * The POST handler supports one-click unsubscribe as required by Gmail/Yahoo
 * since February 2024 for bulk senders.
 */

import { Hono } from "hono";
import { dispatchUnsubscribe } from "../queue.js";
import { unsubscribedHtml } from "../templates/confirm.js";

export const unsubscribeRoute = new Hono();

/**
 * Manual Unsubscribe Link Handler
 *
 * When a user clicks the unsubscribe link in the email body,
 * we dispatch a job to process the unsubscribe and show a confirmation page.
 */
unsubscribeRoute.get("/:contactId/:broadcastId", async (c) => {
  const { contactId, broadcastId } = c.req.param();

  // Dispatch unsubscribe job with source=link
  dispatchUnsubscribe({ contactId, broadcastId, source: "link" }).catch(
    (err) => {
      console.error("Failed to dispatch unsubscribe job:", err);
    }
  );

  // Return confirmation page
  return c.html(unsubscribedHtml);
});

/**
 * RFC 8058 One-Click Unsubscribe Handler
 *
 * Email clients (Gmail, Yahoo, etc.) send a POST request with body:
 * List-Unsubscribe=One-Click
 *
 * We dispatch a job to process the unsubscribe asynchronously and
 * immediately return 200 OK as required by RFC 8058.
 */
unsubscribeRoute.post("/:contactId/:broadcastId", async (c) => {
  const { contactId, broadcastId } = c.req.param();

  // Dispatch unsubscribe job with source=list-unsubscribe
  dispatchUnsubscribe({
    contactId,
    broadcastId,
    source: "list-unsubscribe",
  }).catch((err) => {
    console.error("Failed to dispatch unsubscribe job:", err);
  });

  // Return 200 immediately as required by RFC 8058
  return c.text("Unsubscribed", 200);
});
