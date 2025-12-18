import { configureWorker, queue, queueLogger } from "@/lib/queue";
import { sendBroadcast } from "./send-broadcast";

const logger = queueLogger.child({ worker: "broadcasts" });

configureWorker("broadcasts", {
  processors: {
    "send-broadcast": sendBroadcast,
  },
  concurrency: 1,
});

queue("broadcasts").start();

logger.info(
  {
    jobs: ["send-broadcast"],
    concurrency: 1,
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
