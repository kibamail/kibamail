import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    coverage: {
      exclude: ["**/node_modules/**", "tests/**", ".storybook/*", "**/*.stories.*", "dist/", "storybook-static/**", "postcss/*", "**/index.ts", "vitest.config.ts", "postcss.config.cjs", "scripts/**"],
    }
  },
})
