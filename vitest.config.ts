/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    // Works around astro bug, failing to shut down cloudflare's runtime,
    // resulting in a hanging process error
    teardownTimeout: 1000,
    watchTriggerPatterns: [
      // rebuild on changes to astro source, since test files don't import directly (and vitest watch watches by import graph) (really, only care about content, consider narrowing)
      {
        pattern: /src/,
        testsToRun: () => "./system.test.ts",
      },
    ],
  },
});
