import { configureWorker, queue, queueLogger } from "@/lib/queue";
import { sendBroadcast } from "./send-broadcast";
import { sendBroadcastBatch } from "./send-broadcast-batch";
import { sendTestBroadcast } from "./send-test-broadcast";

const logger = queueLogger.child({ worker: "broadcasts" });

configureWorker("broadcasts", {
  processors: {
    "send-broadcast": sendBroadcast,
    "send-broadcast-batch": sendBroadcastBatch,
    "send-test-broadcast": sendTestBroadcast,
  },
  concurrency: 5, // Process multiple batches concurrently
});

queue("broadcasts").start();

logger.info(
  {
    jobs: ["send-broadcast", "send-broadcast-batch", "send-test-broadcast"],
    concurrency: 5,
  },
  "Broadcasts worker started"
);

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down broadcasts worker");
  await queue("broadcasts").close();
  logger.info("Broadcasts worker stopped");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
