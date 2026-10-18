import Fs from "node:fs/promises";
import Os from "node:os";
import Path from "node:path";
import { mergeConfig, resolveConfig, type UserConfig } from "vite";
import { expect, it, vi } from "vitest";

import svgOptimizer from "../svg-optimizer/integration";

it("optimizes emitted SVGs under a path containing spaces, Unicode and #", async () => {
  const root = await Fs.mkdtemp(Path.join(Os.tmpdir(), "nbastt-svg-test-"));
  try {
    const project = Path.join(root, "NBA Tracker #é");
    const directory = Path.join(project, "custom output/client");
    await Fs.mkdir(directory, { recursive: true });
    const file = Path.join(directory, "logo.svg");
    await Fs.writeFile(
      file,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><metadata>test-only</metadata><path d="M0 0h10v10H0z"/></svg>',
    );
    const { hooks } = svgOptimizer();
    const configure = hooks["astro:config:setup"];
    const build = hooks["astro:build:done"];
    if (!configure || !build) throw new Error("Missing optimizer hooks");
    let config: UserConfig = {
      environments: { client: { build: { outDir: directory } } },
      root: project,
    };
    // Let the real Vite resolver supply paths to the integration's plugin.
    await configure({
      updateConfig: ({ vite }: { vite: UserConfig }) => {
        config = mergeConfig(config, vite);
      },
    } as unknown as Parameters<typeof configure>[0]);
    await resolveConfig({ ...config, configFile: false }, "build");
    await build({
      logger: { info: vi.fn(), warn: vi.fn() },
    } as unknown as Parameters<typeof build>[0]);
    const optimized = await Fs.readFile(file, "utf8");
    expect(optimized).toContain('viewBox="0 0 10 10"');
    expect(optimized).not.toContain("metadata");
  } finally {
    await Fs.rm(root, { force: true, recursive: true });
  }
});
