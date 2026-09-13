import Fs from "node:fs/promises";
import Os from "node:os";
import Path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it, vi } from "vitest";

import svgOptimizer from "../svg-optimizer/integration";

it("optimizes emitted SVGs under a path containing spaces, Unicode and #", async () => {
  const root = await Fs.mkdtemp(Path.join(Os.tmpdir(), "nbastt-svg-test-"));
  try {
    const directory = Path.join(root, "NBA Tracker #é");
    await Fs.mkdir(directory);
    const file = Path.join(directory, "logo.svg");
    await Fs.writeFile(
      file,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><metadata>test-only</metadata><path d="M0 0h10v10H0z"/></svg>',
    );
    const { hooks } = svgOptimizer();
    const configure = hooks["astro:config:done"];
    const build = hooks["astro:build:done"];
    if (!configure || !build) throw new Error("Missing optimizer hooks");
    // Supply just the framework fields consumed by these actual hooks.
    await configure({
      config: { build: { client: pathToFileURL(`${directory}/`) } },
    } as Parameters<typeof configure>[0]);
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
