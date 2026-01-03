/**
 * Double Opt-In Confirmation Route
 *
 * Handles confirmation link clicks from double opt-in emails.
 * Route: GET /confirm/{formId}/{token}
 *
 * Dispatches a job to confirm the contact and shows a thank you page.
 */

import { Hono } from "hono";
import { dispatchConfirmation } from "../queue.js";
import { thankYouHtml, errorHtml } from "../templates/confirm.js";

export const confirmRoute = new Hono();

confirmRoute.get("/:formId/:token", async (c) => {
  const { formId, token } = c.req.param();

  // Validate token format (64 hex characters)
  if (!formId || !token || token.length !== 64) {
    return c.html(errorHtml, 400);
  }

  try {
    // Dispatch the confirmation job
    await dispatchConfirmation({
      formId,
      confirmationToken: token,
    });

    return c.html(thankYouHtml);
  } catch (error) {
    console.error("Failed to dispatch confirmation job:", error);
    return c.html(errorHtml, 500);
  }
});
