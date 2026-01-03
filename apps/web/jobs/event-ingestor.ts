/**
 * Event Ingestor Worker
 *
 * Consumes email events from NATS JetStream and inserts them into the database.
 * This is a standalone process that runs independently from the main web app.
 *
 * Usage:
 *   pnpm event-ingestor
 *
 * Environment variables:
 *   - NATS_URL: NATS server URL (e.g., tls://localhost:4222)
 *   - NATS_USER: NATS username
 *   - NATS_PASSWORD: NATS password
 *   - NATS_TLS_CA: Base64-encoded CA certificate
 *   - OTEL_EXPORTER_OTLP_ENDPOINT: OpenTelemetry collector endpoint
 *   - OTEL_SERVICE_NAME: Service name for telemetry (default: kibamail-event-ingestor)
 */

// Initialize OpenTelemetry instrumentation first (before any other imports)
import { shutdownOtel } from "./instrumentation";

import express from "express";
import { queueLogger } from "@/lib/queue";
import {
  getNatsOptions,
  startEventConsumer,
  ensureEventsStream,
  closeNatsConnection,
} from "@/lib/nats";
import { processEventsWithSideEffects } from "@/lib/nats/event-processor";
import type { BatchTraceContext } from "@/lib/nats/instrumentation";
import type { EventConsumerConfig } from "@/lib/nats/event-types";

const logger = queueLogger.child({ worker: "event-ingestor" });
const METRICS_PORT = process.env.METRICS_PORT || 9091;

// Consumer configuration
const consumerConfig: EventConsumerConfig = {
  batchSize: parseInt(process.env.EVENT_BATCH_SIZE || "100", 10),
  batchTimeoutMs: parseInt(process.env.EVENT_BATCH_TIMEOUT_MS || "1000", 10),
  concurrency: parseInt(process.env.EVENT_CONCURRENCY || "4", 10),
  consumerName: process.env.EVENT_CONSUMER_NAME || "control-plane-events",
};

// Consumer handle
let consumer: {
  stop: () => Promise<void>;
  isRunning: () => boolean;
  getStats: () => Promise<{ pending: number; ackPending: number }>;
} | null = null;

// Metrics
let eventsProcessed = 0;
let eventsErrors = 0;
let lastProcessedAt: Date | null = null;
let pendingMessages = 0;
let ackPending = 0;

/**
 * Start the event ingestor
 */
async function start(): Promise<void> {
  logger.info({ config: consumerConfig }, "Starting event ingestor");

  const options = getNatsOptions();

  // Ensure EVENTS stream exists
  await ensureEventsStream(options);

  // Start consuming events
  consumer = await startEventConsumer(
    options,
    async (events, traceContext?: BatchTraceContext) => {
      try {
        await processEventsWithSideEffects(events, traceContext);
        eventsProcessed += events.length;
        lastProcessedAt = new Date();
      } catch (error) {
        eventsErrors += events.length;
        throw error;
      }
    },
    consumerConfig
  );

  logger.info("Event ingestor started successfully");
}

// ============================================================
// HTTP Server for Health Checks and Metrics
// ============================================================

const app = express();

app.get("/metrics", async (_req, res) => {
  // Fetch latest NATS consumer stats
  if (consumer?.isRunning()) {
    const stats = await consumer.getStats();
    pendingMessages = stats.pending;
    ackPending = stats.ackPending;
  }

  const metrics = [
    `# HELP event_ingestor_events_processed_total Total number of events processed`,
    `# TYPE event_ingestor_events_processed_total counter`,
    `event_ingestor_events_processed_total ${eventsProcessed}`,
    ``,
    `# HELP event_ingestor_events_errors_total Total number of event processing errors`,
    `# TYPE event_ingestor_events_errors_total counter`,
    `event_ingestor_events_errors_total ${eventsErrors}`,
    ``,
    `# HELP event_ingestor_running Whether the consumer is running`,
    `# TYPE event_ingestor_running gauge`,
    `event_ingestor_running ${consumer?.isRunning() ? 1 : 0}`,
    ``,
    `# HELP event_ingestor_nats_pending_messages Number of messages pending in the stream`,
    `# TYPE event_ingestor_nats_pending_messages gauge`,
    `event_ingestor_nats_pending_messages ${pendingMessages}`,
    ``,
    `# HELP event_ingestor_nats_ack_pending Number of messages pending acknowledgment`,
    `# TYPE event_ingestor_nats_ack_pending gauge`,
    `event_ingestor_nats_ack_pending ${ackPending}`,
    ``,
    `# HELP event_ingestor_consumer_lag Consumer lag (pending - ack_pending)`,
    `# TYPE event_ingestor_consumer_lag gauge`,
    `event_ingestor_consumer_lag ${pendingMessages - ackPending}`,
  ].join("\n");

  res.set("Content-Type", "text/plain");
  res.send(metrics);
});

app.get("/health", async (_req, res) => {
  if (consumer?.isRunning()) {
    const stats = await consumer.getStats();
    res.status(200).json({
      status: "healthy",
      eventsProcessed,
      eventsErrors,
      lastProcessedAt: lastProcessedAt?.toISOString() || null,
      nats: {
        pending: stats.pending,
        ackPending: stats.ackPending,
        lag: stats.pending - stats.ackPending,
      },
    });
  } else {
    res.status(503).json({
      status: "unhealthy",
      message: "Consumer is not running",
    });
  }
});

app.get("/ready", (_req, res) => {
  if (consumer?.isRunning()) {
    res.status(200).send("ready");
  } else {
    res.status(503).send("not ready");
  }
});

const server = app.listen(METRICS_PORT, () => {
  logger.info({ port: METRICS_PORT }, "Health check server started");
});

// ============================================================
// Graceful shutdown
// ============================================================

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down event ingestor");

  server.close();

  if (consumer) {
    await consumer.stop();
  }

  await closeNatsConnection();
  await shutdownOtel();

  logger.info(
    {
      eventsProcessed,
      eventsErrors,
    },
    "Event ingestor stopped"
  );

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logger.error(
    { error: error.message, stack: error.stack },
    "Uncaught exception"
  );
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  shutdown("unhandledRejection");
});

// ============================================================
// Start
// ============================================================

start().catch((error) => {
  logger.error({ error }, "Failed to start event ingestor");
  process.exit(1);
});
