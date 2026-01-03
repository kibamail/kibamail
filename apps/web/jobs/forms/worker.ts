import { configureWorker, queue, queueLogger } from "@/lib/queue";
import { sendDoubleOptIn } from "./send-double-opt-in";

const logger = queueLogger.child({ worker: "forms" });

configureWorker("forms", {
  processors: {
    "send-double-opt-in": sendDoubleOptIn,
  },
  concurrency: 10, // Can process multiple confirmation emails concurrently
});

queue("forms").start();

logger.info(
  {
    jobs: ["send-double-opt-in"],
    concurrency: 10,
  },
  "Forms worker started"
);

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down forms worker");
  await queue("forms").close();
  logger.info("Forms worker stopped");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
