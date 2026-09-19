/// <reference types="vitest/config" />
import type { UserConfig, UserConfigFnPromise } from "vite";

import { getViteConfig } from "astro/config";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const astroConfig = getViteConfig({
  test: {
    alias: {
      "cloudflare:workers": fileURLToPath(
        new URL("tests/worker-bindings.ts", import.meta.url),
      ),
      "virtual:tracker/catalog": fileURLToPath(
        new URL("tests/catalog-fixture.ts", import.meta.url),
      ),
    },
    include: ["tests/**/*.test.ts"],
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    watchTriggerPatterns: [
      {
        // SQL is read through fs, not imported into Vite's module graph.
        pattern: /[\\/]data[\\/].*\.sql$/,
        testsToRun: () =>
          readdirSync(new URL("tests/", import.meta.url), {
            encoding: "utf8",
            recursive: true,
          })
            .filter((name) => name.endsWith(".test.ts"))
            .map((name) => `./tests/${name}`),
      },
      // Presentation changes still need dataset-level checks, independently of imports.
      {
        pattern: /src/,
        testsToRun: () => "./tests/system.test.ts",
      },
    ],
  },
});

const isAppRuntimePlugin = (plugin: unknown) =>
  typeof plugin === "object" &&
  plugin !== null &&
  "name" in plugin &&
  typeof plugin.name === "string" &&
  (plugin.name.startsWith("vite-plugin-cloudflare:") ||
    plugin.name === "tracker-sqlite-boundary" ||
    plugin.name === "tracker-data");

// The adapter supplies Cloudflare development plugins, whose Node-compat import
// resolver expects a dev dependency optimizer. Vitest disables optimization by
// default, causing "AssertionError: depsOptimizer is required in dev mode".
// trackerData's Astro hooks still select a canonical snapshot and inject types;
// we remove only its Vite runtime plugin, avoiding a second data owner beside
// the fixture alias. This is Node unit/maintenance coverage, not island emulation.
// Keep this suite in Node without that Worker-specific wiring. Database tests
// are Node maintenance consumers, not Worker SSR. The SQLite boundary tests
// instantiate real Vite servers/builds with the guard explicitly enabled.
// The catalog alias restores canonical SQL into a fresh temporary database,
// independent of the working DB. Other Astro plugins still resolve action and
// asset modules. No framework content store or collection API is emulated.
const config: UserConfigFnPromise = async (env) => {
  const resolved = (await astroConfig(env)) as UserConfig;
  const plugins = (resolved.plugins ?? []) as unknown[];

  resolved.plugins = plugins
    .flat(Infinity)
    .filter((plugin) => !isAppRuntimePlugin(plugin)) as NonNullable<
    UserConfig["plugins"]
  >;

  return resolved;
};

export default config;
