import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts"],
      // Engine rule (CLAUDE.md #3): the money path is fully branch-covered.
      thresholds: { branches: 100 },
    },
  },
});
