#!/usr/bin/env bun

/**
 * Test script to debug queue connection issues
 */

import { queue } from "@/lib/queue";

async function testQueue() {
  console.log("Testing queue connection...");

  try {
    console.log("Attempting to push a test job...");
    const jobId = await queue("segments").push("compute-contacts-count", {
      segmentIds: ["test-segment-id"],
    });
    console.log("✓ Successfully pushed job:", jobId);
  } catch (error) {
    console.error("✗ Failed to push job:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Check if it's a specific BullMQ error
    if (error.cause) {
      console.error("Error cause:", error.cause);
    }
  }

  process.exit(0);
}

testQueue();
