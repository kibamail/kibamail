#!/usr/bin/env bun

/**
 * Generate TypeScript declaration files for the SDK
 */

import { $ } from "bun";
import { existsSync } from "node:fs";
import { mkdir, rename, copyFile } from "node:fs/promises";

async function generateDeclarations() {
  console.log("Generating TypeScript declarations...");

  // Ensure dist directory exists
  if (!existsSync("./dist")) {
    await mkdir("./dist", { recursive: true });
  }

  // Run TypeScript compiler to generate .d.ts files
  await $`bunx tsc --project tsconfig.build.json`;

  // Copy schema.d.ts to dist
  if (existsSync("./schema.d.ts")) {
    await copyFile("./schema.d.ts", "./dist/schema.d.ts");
  }

  // Create .d.mts file for ESM (same as .d.ts)
  if (existsSync("./dist/index.d.ts")) {
    await copyFile("./dist/index.d.ts", "./dist/index.d.mts");
  }

  console.log("✓ TypeScript declarations generated successfully");
}

generateDeclarations().catch((error) => {
  console.error("Failed to generate declarations:", error);
  process.exit(1);
});
