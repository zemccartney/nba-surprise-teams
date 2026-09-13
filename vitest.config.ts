/// <reference types="vitest/config" />
import type { UserConfig, UserConfigFnPromise } from "vite";

import { getViteConfig } from "astro/config";

const astroConfig = getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    watchTriggerPatterns: [
      // rebuild on changes to astro source, since test files don't import directly (and vitest watch watches by import graph) (really, only care about content, consider narrowing)
      {
        pattern: /src/,
        testsToRun: () => "./tests/system.test.ts",
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

// The adapter supplies Cloudflare development plugins, whose Node-compat import
// resolver expects a dev dependency optimizer. Vitest disables optimization by
// default, causing "AssertionError: depsOptimizer is required in dev mode".
// Keep this suite in Node without that Worker-specific wiring. Astro plugins
// still resolve virtual module imports, but tests mock the content API and read
// source JSON explicitly: this configuration does not refresh content stores.
// See plan/new-season-sweep/content-lifecycle.md. A smaller Vite configuration
// can be considered later; do not expand this into a content-sync harness.
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
