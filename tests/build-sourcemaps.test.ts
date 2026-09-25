import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { cleanBuildSourcemaps } from "../scripts/clean-build-sourcemaps";

const { join } = path;
const temporary: string[] = [];
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "nbastt-maps-"));
  temporary.push(root);
  return root;
};
afterEach(() => {
  for (const root of temporary.splice(0))
    rmSync(root, { force: true, recursive: true });
});

describe("build source map lifecycle", () => {
  it("removes server and client maps without changing deployable files", () => {
    const root = fixture();
    for (const directory of ["server/chunks", "client/_astro"]) {
      const path = join(root, directory);
      mkdirSync(path, { recursive: true });
      writeFileSync(join(path, "app.js"), "unchanged");
      writeFileSync(join(path, "app.js.map"), "{}");
    }
    expect(cleanBuildSourcemaps(root)).toBe(2);
    for (const directory of ["server/chunks", "client/_astro"]) {
      expect(readdirSync(join(root, directory))).toEqual(["app.js"]);
      expect(readFileSync(join(root, directory, "app.js"), "utf8")).toBe(
        "unchanged",
      );
    }
    expect(cleanBuildSourcemaps(root)).toBe(0);
  });

  it("does not follow directory symlinks outside the build output", () => {
    const root = fixture();
    const outside = fixture();
    writeFileSync(join(outside, "private.map"), "untouched");
    symlinkSync(outside, join(root, "linked"), "dir");
    expect(cleanBuildSourcemaps(root)).toBe(0);
    expect(readFileSync(join(outside, "private.map"), "utf8")).toBe(
      "untouched",
    );
  });

  it("cleans only after Astro finishes and before artifact auditing", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { scripts: { build: string } };
    expect(pkg.scripts.build).toContain(
      "astro build && node data/node/audit.ts",
    );
    const config = readFileSync(
      new URL("../astro.config.mjs", import.meta.url),
      "utf8",
    );
    expect(config).toContain("filesToDeleteAfterUpload: []");
    expect(config).toContain("cleanBuildSourcemapsIntegration(),");
    expect(config.indexOf("cleanBuildSourcemapsIntegration(),")).toBeLessThan(
      config.indexOf("trackerData(),"),
    );
  });
});
