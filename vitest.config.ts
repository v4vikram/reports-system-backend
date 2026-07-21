import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./tests/global-setup.ts",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // All test files share one real Postgres test DB (integration-style,
    // not mocked) — running files in parallel would race on shared state,
    // so trade speed for correctness and run them sequentially.
    fileParallelism: false,
  },
});
