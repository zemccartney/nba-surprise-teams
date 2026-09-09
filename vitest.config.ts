/// <reference types="vitest/config" />
import type { UserConfig, UserConfigFnPromise } from "vite";

import { getViteConfig } from "astro/config";

const astroConfig = getViteConfig({
  test: {
    watchTriggerPatterns: [
      // rebuild on changes to astro source, since test files don't import directly (and vitest watch watches by import graph) (really, only care about content, consider narrowing)
      {
        pattern: /src/,
        testsToRun: () => "./system.test.ts",
      },
    ],
  },
});

const isCloudflareDevPlugin = (plugin: unknown) =>
  typeof plugin === "object" &&
  plugin !== null &&
  "name" in plugin &&
  typeof plugin.name === "string" &&
  plugin.name.startsWith("vite-plugin-cloudflare:");

// @cloudflare/vite-plugin (pulled in by the adapter since v13) starts a workerd
// runner for the dev environment, which Vitest's node environment cannot
// satisfy: "AssertionError: depsOptimizer is required in dev mode". The system
// test only reads content collections, so the Cloudflare dev plugins come out
// and the suite runs in plain node. The Astro-side plugins stay, since they are
// what make `astro:content` resolve. Dropping them also fixed the hanging-Vite-
// server warning that `teardownTimeout` used to paper over.
const config: UserConfigFnPromise = async (env) => {
  const resolved = (await astroConfig(env)) as UserConfig;
  const plugins = (resolved.plugins ?? []) as unknown[];

  resolved.plugins = plugins
    .flat(Infinity)
    .filter((plugin) => !isCloudflareDevPlugin(plugin)) as NonNullable<
    UserConfig["plugins"]
  >;

  return resolved;
};

export default config;
