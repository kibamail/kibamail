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
import { html } from "hono/html";
import { dispatchUnsubscribe } from "../queue.js";

export const unsubscribeRoute = new Hono();

/**
 * Generate the unsubscribe confirmation HTML page
 */
function unsubscribeConfirmationPage() {
  return html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Unsubscribed</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              Roboto,
              Oxygen,
              Ubuntu,
              sans-serif;
            background-color: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 48px;
            max-width: 480px;
            text-align: center;
          }
          .icon {
            width: 64px;
            height: 64px;
            background-color: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          .icon svg {
            width: 32px;
            height: 32px;
            color: white;
          }
          h1 {
            color: #111827;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 12px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1>You've been unsubscribed</h1>
          <p>
            You will no longer receive emails from this sender. This change may
            take a few minutes to process.
          </p>
        </div>
      </body>
    </html>
  `;
}

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
  return c.html(unsubscribeConfirmationPage());
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
