/**
 * Structured Logger
 *
 * Pino-based logger with structured JSON output for production.
 * Includes child loggers for different route contexts.
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: "kibamail-tracking",
  },
});

/**
 * Create a child logger for open tracking events
 */
export function openLogger(data: {
  emailSendId: string;
  userAgent?: string;
  ip?: string;
}) {
  return logger.child({
    route: "open",
    emailSendId: data.emailSendId,
    userAgent: data.userAgent,
    ip: data.ip,
  });
}

/**
 * Create a child logger for click tracking events
 */
export function clickLogger(data: {
  emailSendId: string;
  url: string;
  userAgent?: string;
  ip?: string;
}) {
  return logger.child({
    route: "click",
    emailSendId: data.emailSendId,
    url: data.url,
    userAgent: data.userAgent,
    ip: data.ip,
  });
}

/**
 * Create a child logger for unsubscribe events
 */
export function unsubscribeLogger(
  data:
    | {
        contactId: string;
        broadcastId: string;
        source: "link" | "list-unsubscribe";
      }
    | {
        sendingId: string;
        source: "link" | "list-unsubscribe";
      },
) {
  return logger.child({
    route: "unsubscribe",
    ...data,
  });
}

/**
 * Create a child logger for double opt-in confirmation events
 */
export function confirmLogger(data: { formId: string }) {
  return logger.child({
    route: "confirm",
    formId: data.formId,
  });
}

/**
 * Create a child logger for image proxy events
 */
export function imageLogger(data: { originalHost: string }) {
  return logger.child({
    route: "image",
    originalHost: data.originalHost,
  });
}

/**
 * Create a child logger for ACME challenge events
 */
export function acmeLogger(data: { domain: string; token: string }) {
  return logger.child({
    route: "acme-challenge",
    domain: data.domain,
    token: data.token,
  });
}
