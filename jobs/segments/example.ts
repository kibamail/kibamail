/**
 * Example: Pushing Segment Jobs
 *
 * This file demonstrates how to push jobs to the segments queue
 *
 * To run this example:
 * ```bash
 * bun run jobs/segments/example.ts
 * ```
 */

import { queue } from "@/lib/queue";

async function main() {
  console.log("Pushing segment jobs to the queue...\n");

  // Example 1: Compute contacts count for a single segment
  const jobId1 = await queue("segments").push("compute-contacts-count", {
    segmentIds: ["segment_123"],
  });
  console.log(`✓ Job pushed: ${jobId1}`);

  // Example 2: Compute contacts count for multiple segments
  const jobId2 = await queue("segments").push("compute-contacts-count", {
    segmentIds: ["segment_456", "segment_789", "segment_abc"],
  });
  console.log(`✓ Job pushed: ${jobId2}`);

  // Example 3: Push with options (priority, delay, etc.)
  const jobId3 = await queue("segments").push(
    "compute-contacts-count",
    {
      segmentIds: ["segment_xyz"],
    },
    {
      priority: 10, // Higher priority
      delay: 5000, // Delay by 5 seconds
    },
  );
  console.log(`✓ Job pushed with options: ${jobId3}`);

  // Example 4: Bulk push multiple jobs
  const jobIds = await queue("segments").pushBulk([
    {
      name: "compute-contacts-count",
      data: { segmentIds: ["segment_001"] },
    },
    {
      name: "compute-contacts-count",
      data: { segmentIds: ["segment_002", "segment_003"] },
    },
  ]);
  console.log(`✓ Bulk jobs pushed: ${jobIds.join(", ")}`);

  console.log("\nAll jobs pushed successfully!");
  console.log("Make sure the worker is running to process these jobs:");
  console.log("  bun run jobs/segments/worker.ts");

  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
