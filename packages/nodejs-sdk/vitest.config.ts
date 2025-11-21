import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Global test timeout (30 seconds)
    testTimeout: 30000,

    // Setup files to run before tests
    setupFiles: ["./tests/setup.ts"],

    // Include test files
    include: ["tests/**/*.test.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "*.config.ts",
      ],
    },

    // Test reporters
    reporters: ["verbose"],

    // Globals
    globals: true,
  },
});
