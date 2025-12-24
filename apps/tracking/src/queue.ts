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
 * Close the queue connection (for graceful shutdown)
 */
export async function closeQueue(): Promise<void> {
  await trackingQueue.close();
}
