import type { Plugin, ResolvedConfig } from "vite";

import assert from "node:assert/strict";
import Path from "node:path";

// cf Build Output v0. Standalone commands have no resolved Vite configuration.
export const cloudflareOutputDirectory = ".cloudflare/output/v0";
export const workerOutputDirectory = (directory = cloudflareOutputDirectory) =>
  Path.resolve(directory, "workers/default");

/**
Read paths lazily: Cloudflare and Astro mutate them during configResolved.
*/
export function captureBuildOutput() {
  let config: ResolvedConfig | undefined;
  const directory = (environment: "client" | "ssr") => {
    assert.ok(config, "Vite has not resolved build output paths");
    const outDir = config.environments[environment]?.build.outDir;
    assert.ok(outDir, `Missing Vite ${environment} output directory`);
    return Path.resolve(config.root, outDir);
  };
  const plugin: Plugin = {
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    name: "capture-build-output",
  };
  return {
    clientDirectory: () => directory("client"),
    plugin,
    workerDirectory() {
      const bundle = directory("ssr");
      const worker = Path.dirname(bundle);
      // The auditor uses relative assets/ and bundle/ paths in its inventory.
      // Fail closed if an adapter change invalidates that contract.
      assert.equal(
        bundle,
        Path.join(worker, "bundle"),
        "Unexpected Worker output layout",
      );
      assert.equal(
        directory("client"),
        Path.join(worker, "assets"),
        "Unexpected Worker output layout",
      );
      return worker;
    },
  };
}
