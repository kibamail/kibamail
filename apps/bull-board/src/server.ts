/**
 * Bull Board Dashboard Server
 *
 * Provides a web UI for monitoring BullMQ queues from the apps/web project
 */

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { Queue } from "bullmq";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { env } from "./env.js";

/**
 * Queue names that match the queues defined in apps/web/lib/queue/types.ts
 */
const QUEUE_NAMES = [
  "example",
  "segments",
  "contact-imports",
  "broadcasts",
  "sending-domains",
] as const;

/**
 * Redis connection configuration
 */
const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DATABASE,
  maxRetriesPerRequest: null,
};

/**
 * Create Queue instances for monitoring
 * Note: These are read-only connections for the dashboard
 */
const queues = QUEUE_NAMES.map((name) => {
  return new Queue(name, { connection: redisConnection });
});

/**
 * Set up Bull Board with Hono adapter
 */
const serverAdapter = new HonoAdapter(serveStatic);

createBullBoard({
  queues: queues.map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: "Kibamail Queue Dashboard",
    },
  },
});

/**
 * Create Hono app
 */
const app = new Hono();

/**
 * Add basic authentication
 */
app.use(
  "*",
  basicAuth({
    username: env.BULL_BOARD_USERNAME,
    password: env.BULL_BOARD_PASSWORD,
  })
);

/**
 * Mount Bull Board routes
 */
app.route("/", serverAdapter.registerPlugin());

/**
 * Start server
 */
const port = env.BULL_BOARD_PORT;

console.log(`Bull Board Dashboard starting on http://localhost:${port}`);
console.log(`Monitoring ${queues.length} queues: ${QUEUE_NAMES.join(", ")}`);
console.log(`Username: ${env.BULL_BOARD_USERNAME}`);

serve({
  fetch: app.fetch,
  port,
});
