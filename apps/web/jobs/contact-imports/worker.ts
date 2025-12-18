import { configureWorker, queue, queueLogger } from "@/lib/queue";
import { processImport } from "./process-import";

const logger = queueLogger.child({ worker: "contact-imports" });

configureWorker("contact-imports", {
  processors: {
    "process-import": processImport,
  },
  concurrency: 1,
});

queue("contact-imports").start();

logger.info(
  {
    jobs: ["process-import"],
    concurrency: 1,
  },
  "Contact imports worker started"
);

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down contact imports worker");
  await queue("contact-imports").close();
  logger.info("Contact imports worker stopped");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
