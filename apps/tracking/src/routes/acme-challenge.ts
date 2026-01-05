/**
 * ACME Challenge Route
 *
 * Serves HTTP-01 challenge responses for Let's Encrypt SSL certificate validation.
 * Route: GET /.well-known/acme-challenge/{token}
 *
 * Let's Encrypt makes this request to verify domain ownership before issuing a certificate.
 * We fetch the challenge response from the internal API (apps/web).
 */

import { Hono } from "hono";
import { env } from "../env.js";
import { acmeLogger } from "../logger.js";

interface AcmeChallengeResponse {
  keyAuthorization?: string;
  error?: string;
}

export const acmeChallengeRoute = new Hono();

acmeChallengeRoute.get("/:token", async (c) => {
  const { token } = c.req.param();
  const domain = c.req.header("Host") || "unknown";

  if (!token) {
    return c.text("Not Found", 404);
  }

  const log = acmeLogger({ domain, token });

  try {
    // Fetch the challenge response from the internal API
    const response = await fetch(
      `${env.INTERNAL_API_URL}/api/internal/v1/acme-challenges/${token}`,
      {
        headers: {
          Authorization: `Bearer ${env.INTERNAL_SERVICE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      log.warn({ status: response.status }, "ACME challenge lookup failed");
      return c.text("Not Found", 404);
    }

    const data = (await response.json()) as AcmeChallengeResponse;

    if (!data.keyAuthorization) {
      log.warn("ACME challenge found but no keyAuthorization");
      return c.text("Not Found", 404);
    }

    log.info("ACME challenge served");

    // Return the key authorization as plain text (ACME requirement)
    return c.text(data.keyAuthorization, 200, {
      "Content-Type": "text/plain",
    });
  } catch (error) {
    log.error({ err: error }, "Failed to fetch ACME challenge");
    return c.text("Internal Server Error", 500);
  }
});
