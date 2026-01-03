// Initialize OpenTelemetry instrumentation first (before any other imports)

import express from "express";
import { closeAll, configureWorker, queue, queueLogger } from "@/lib/queue";
import { sendBroadcast } from "./broadcasts/send-broadcast";
import { sendBroadcastBatch } from "./broadcasts/send-broadcast-batch";
import { sendTestBroadcast } from "./broadcasts/send-test-broadcast";
import { processImport } from "./contact-imports/process-import";
import { confirmDoubleOptIn } from "./forms/confirm-double-opt-in";
import { sendDoubleOptIn } from "./forms/send-double-opt-in";
import { shutdownOtel } from "./instrumentation";
import { computeContactsCount } from "./segments/compute-contacts-count";
import { checkVerification } from "./sending-domains/check-verification";

const logger = queueLogger.child({ worker: "unified" });
const METRICS_PORT = process.env.METRICS_PORT || 9090;

// ============================================================
// Configure all workers
// ============================================================

configureWorker("segments", {
  processors: {
    "compute-contacts-count": computeContactsCount,
  },
  concurrency: 3,
});

configureWorker("contact-imports", {
  processors: {
    "process-import": processImport,
  },
  concurrency: 1,
});

configureWorker("sending-domains", {
  processors: {
    "check-verification": checkVerification,
  },
  concurrency: 3,
});

configureWorker("broadcasts", {
  processors: {
    "send-broadcast": sendBroadcast,
    "send-broadcast-batch": sendBroadcastBatch,
    "send-test-broadcast": sendTestBroadcast,
  },
  concurrency: 5,
});

configureWorker("forms", {
  processors: {
    "send-double-opt-in": sendDoubleOptIn,
    "confirm-double-opt-in": confirmDoubleOptIn,
  },
  concurrency: 5,
});

// ============================================================
// Start all workers
// ============================================================

const queues = [
  "segments",
  "contact-imports",
  "sending-domains",
  "broadcasts",
  "forms",
] as const;

for (const queueName of queues) {
  queue(queueName).start();
}

logger.info(
  {
    queues: queues.map((q) => q),
    workers: [
      { queue: "segments", jobs: ["compute-contacts-count"], concurrency: 3 },
      { queue: "contact-imports", jobs: ["process-import"], concurrency: 1 },
      {
        queue: "sending-domains",
        jobs: ["check-verification"],
        concurrency: 3,
      },
      {
        queue: "broadcasts",
        jobs: ["send-broadcast", "send-broadcast-batch", "send-test-broadcast"],
        concurrency: 5,
      },
      {
        queue: "forms",
        jobs: ["send-double-opt-in", "confirm-double-opt-in"],
        concurrency: 5,
      },
    ],
  },
  "All workers started",
);

// ============================================================
// Prometheus Metrics Server
// ============================================================

const app = express();

app.get("/metrics", async (_req, res) => {
  try {
    const metricsPromises = queues.map((queueName) =>
      queue(queueName).getQueue().getQueue().exportPrometheusMetrics(),
    );

    const allMetrics = await Promise.all(metricsPromises);
    const combinedMetrics = allMetrics.join("\n");

    res.set("Content-Type", "text/plain");
    res.send(combinedMetrics);
  } catch (error) {
    logger.error({ error }, "Failed to export metrics");
    res.status(500).send("Failed to export metrics");
  }
});

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

const metricsServer = app.listen(METRICS_PORT, () => {
  logger.info({ port: METRICS_PORT }, "Metrics server started");
});

// ============================================================
// Graceful shutdown
// ============================================================

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down all workers");

  metricsServer.close();
  await closeAll();
  await shutdownOtel();

  logger.info("All workers stopped");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logger.error(
    { error: error.message, stack: error.stack },
    "Uncaught exception",
  );
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  shutdown("unhandledRejection");
});
