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
import { confirmLogger, logger } from "../logger.js";

export const confirmRoute = new Hono();

confirmRoute.get("/:formId/:token", async (c) => {
  const { formId, token } = c.req.param();

  // Validate token format (64 hex characters)
  if (!formId || !token || token.length !== 64) {
    logger.warn({ formId, tokenLength: token?.length }, "Invalid confirmation token format");
    return c.html(errorHtml, 400);
  }

  const log = confirmLogger({ formId });

  try {
    // Dispatch the confirmation job
    await dispatchConfirmation({
      formId,
      confirmationToken: token,
    });

    log.info("Confirmation dispatched");
    return c.html(thankYouHtml);
  } catch (error) {
    log.error({ err: error }, "Failed to dispatch confirmation job");
    return c.html(errorHtml, 500);
  }
});
