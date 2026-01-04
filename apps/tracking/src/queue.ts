/**
 * Queue Client for Tracking Events
 *
 * Dispatches tracking events to BullMQ for async processing.
 */

import { Queue } from "bullmq";
import { env } from "./env.js";

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DATABASE,
  maxRetriesPerRequest: null,
};

// Tracking events queue
const trackingQueue = new Queue("tracking", { connection });

// Forms queue (shared with apps/web worker)
const formsQueue = new Queue("forms", { connection });

// Contacts queue (shared with apps/web worker)
const contactsQueue = new Queue("contacts", { connection });

export interface OpenEvent {
  emailSendId: string;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

export interface ClickEvent {
  emailSendId: string;
  originalUrl: string;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

export interface ConfirmationEvent {
  formId: string;
  confirmationToken: string;
}

export interface UnsubscribeEvent {
  contactId: string;
  broadcastId: string;
  source: "link" | "list-unsubscribe";
}

/**
 * Record an email open event
 */
export async function recordOpen(event: OpenEvent): Promise<void> {
  await trackingQueue.add("record-open", event, {
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

/**
 * Record a link click event
 */
export async function recordClick(event: ClickEvent): Promise<void> {
  await trackingQueue.add("record-click", event, {
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

/**
 * Dispatch a double opt-in confirmation job
 *
 * This pushes to the forms queue which is processed by apps/web worker.
 */
export async function dispatchConfirmation(
  event: ConfirmationEvent
): Promise<void> {
  await formsQueue.add("confirm-double-opt-in", event, {
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

/**
 * Dispatch an unsubscribe job
 *
 * This pushes to the contacts queue which is processed by apps/web worker.
 * Handles RFC 8058 one-click unsubscribe and manual unsubscribe requests.
 */
export async function dispatchUnsubscribe(
  event: UnsubscribeEvent
): Promise<void> {
  await contactsQueue.add("unsubscribe", event, {
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

/**
 * Close all queue connections (for graceful shutdown)
 */
export async function closeQueue(): Promise<void> {
  await Promise.all([
    trackingQueue.close(),
    formsQueue.close(),
    contactsQueue.close(),
  ]);
}
