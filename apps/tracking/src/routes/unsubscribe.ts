/**
 * Unsubscribe Route
 *
 * Handles unsubscribe requests from email links.
 *
 * Routes:
 * - GET /u/{contactId}/{broadcastId} - Manual unsubscribe link click (contact-based)
 * - POST /u/{contactId}/{broadcastId} - RFC 8058 one-click unsubscribe (contact-based)
 * - GET /us/{sendingId} - Manual unsubscribe link click (email-only sends)
 * - POST /us/{sendingId} - RFC 8058 one-click unsubscribe (email-only sends)
 *
 * The POST handlers support one-click unsubscribe as required by Gmail/Yahoo
 * since February 2024 for bulk senders.
 */

import { Hono } from "hono";
import { dispatchUnsubscribe, dispatchUnsubscribeBySendingId } from "../queue.js";
import { unsubscribedHtml } from "../templates/confirm.js";
import { unsubscribeLogger } from "../logger.js";

export const unsubscribeRoute = new Hono();

/**
 * Manual Unsubscribe Link Handler
 *
 * When a user clicks the unsubscribe link in the email body,
 * we dispatch a job to process the unsubscribe and show a confirmation page.
 */
unsubscribeRoute.get("/:contactId/:broadcastId", async (c) => {
  const { contactId, broadcastId } = c.req.param();

  const log = unsubscribeLogger({ contactId, broadcastId, source: "link" });
  log.info("Unsubscribe via link");

  // Dispatch unsubscribe job with source=link
  dispatchUnsubscribe({ contactId, broadcastId, source: "link" }).catch(
    (err) => {
      log.error({ err }, "Failed to dispatch unsubscribe job");
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

  const log = unsubscribeLogger({ contactId, broadcastId, source: "list-unsubscribe" });
  log.info("Unsubscribe via List-Unsubscribe header (RFC 8058)");

  // Dispatch unsubscribe job with source=list-unsubscribe
  dispatchUnsubscribe({
    contactId,
    broadcastId,
    source: "list-unsubscribe",
  }).catch((err) => {
    log.error({ err }, "Failed to dispatch unsubscribe job");
  });

  // Return 200 immediately as required by RFC 8058
  return c.text("Unsubscribed", 200);
});

// ============================================================================
// SendingId-based Unsubscribe (for email-only sends without contacts)
// ============================================================================

export const unsubscribeBySendingIdRoute = new Hono();

/**
 * Manual Unsubscribe Link Handler (SendingId-based)
 *
 * When a user clicks the unsubscribe link in an email-only broadcast,
 * we dispatch a job to add the email to the suppression list.
 */
unsubscribeBySendingIdRoute.get("/:sendingId", async (c) => {
  const { sendingId } = c.req.param();

  const log = unsubscribeLogger({ sendingId, source: "link" });
  log.info("Unsubscribe via link (sendingId-based)");

  // Dispatch unsubscribe-by-sending-id job
  dispatchUnsubscribeBySendingId({ sendingId, source: "link" }).catch(
    (err) => {
      log.error({ err }, "Failed to dispatch unsubscribe-by-sending-id job");
    }
  );

  // Return confirmation page
  return c.html(unsubscribedHtml);
});

/**
 * RFC 8058 One-Click Unsubscribe Handler (SendingId-based)
 *
 * For email-only sends, uses sendingId to look up the email and add
 * it to the suppression list.
 */
unsubscribeBySendingIdRoute.post("/:sendingId", async (c) => {
  const { sendingId } = c.req.param();

  const log = unsubscribeLogger({ sendingId, source: "list-unsubscribe" });
  log.info("Unsubscribe via List-Unsubscribe header (sendingId-based)");

  // Dispatch unsubscribe-by-sending-id job
  dispatchUnsubscribeBySendingId({
    sendingId,
    source: "list-unsubscribe",
  }).catch((err) => {
    log.error({ err }, "Failed to dispatch unsubscribe-by-sending-id job");
  });

  // Return 200 immediately as required by RFC 8058
  return c.text("Unsubscribed", 200);
});
