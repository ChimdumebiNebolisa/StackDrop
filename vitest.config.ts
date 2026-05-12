import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/unit/**/*.test.ts", "src/tests/integration/**/*.test.ts"],
    globals: false,
    setupFiles: ["src/tests/vitest.setup.ts"],
  },
});
