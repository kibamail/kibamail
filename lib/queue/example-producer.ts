/**
 * Example Queue Producer
 *
 * This file demonstrates how to push jobs to a queue.
 *
 * To run this example:
 * ```bash
 * bun run lib/queue/example-producer.ts
 * ```
 */

import { queue } from "./index";

async function main() {
  console.log("Pushing example jobs to the queue...");

  // Push a single job
  const jobId = await queue("example").push("example-job", {
    message: "Hello from the queue!",
  });

  console.log(`Job pushed with ID: ${jobId}`);

  // Push a job with options
  const delayedJobId = await queue("example").push(
    "example-job",
    {
      message: "This job is delayed by 5 seconds",
    },
    {
      delay: 5000, // 5 second delay
      priority: 10, // High priority
    },
  );

  console.log(`Delayed job pushed with ID: ${delayedJobId}`);

  // Push multiple jobs at once
  const jobIds = await queue("example").pushBulk([
    {
      name: "example-job",
      data: { message: "Bulk job 1" },
    },
    {
      name: "example-job",
      data: { message: "Bulk job 2" },
    },
    {
      name: "example-job",
      data: { message: "Bulk job 3" },
    },
  ]);

  console.log(`Bulk jobs pushed with IDs: ${jobIds.join(", ")}`);

  console.log("\nAll jobs pushed successfully!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
