import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import Path from "node:path";
import { build, createServer } from "vite";
import { describe, expect, it } from "vitest";

import {
  assertPrerender,
  isSqliteModule,
  sqliteBoundary,
} from "../data/runtime-boundary";

// These tests use real Vite hooks/module loading, not simulated plugin contexts.
describe("SQLite execution boundary", () => {
  it("distinguishes Node prerender from server runtime, not development from production", () => {
    expect(() =>
      assertPrerender("prerender", "virtual:tracker/archive"),
    ).not.toThrow();
    for (const environment of ["ssr", "client", "worker", "unknown"]) {
      expect(() =>
        assertPrerender(environment, "virtual:tracker/archive"),
      ).toThrow("prerender-only");
    }
    expect(isSqliteModule("node:sqlite")).toBe(true);
    expect(isSqliteModule("/project/data/node/database.ts?import")).toBe(true);
    expect(isSqliteModule(String.raw`C:\project\data\node\database.ts`)).toBe(
      true,
    );
    expect(isSqliteModule("/project/src/data/catalog.ts")).toBe(false);
  });

  it.each([
    "archive",
    "native",
    "dynamic",
    "reexport",
    "require",
    "transitive",
  ] as const)(
    "rejects %s access during a real dev SSR module load",
    async (kind) => {
      const root = await mkdtemp(Path.join(tmpdir(), "nbastt-boundary-"));
      await mkdir(Path.join(root, "data/node"), { recursive: true });
      await writeFile(
        Path.join(root, "data/node/database.js"),
        'export const value = "must not execute in SSR";',
      );
      await writeFile(
        Path.join(root, "shared.js"),
        'export { value } from "./data/node/database.js";',
      );
      const sources = {
        archive:
          'import { archive } from "virtual:tracker/archive"; export default archive;',
        dynamic: 'export const value = () => import("node:sqlite");',
        native:
          'import { DatabaseSync } from "node:sqlite"; export default DatabaseSync;',
        reexport: 'export { DatabaseSync } from "node:sqlite";',
        require: 'export const value = require("node:sqlite");',
        transitive:
          'import { value } from "./shared.js"; export default value;',
      };
      await writeFile(Path.join(root, "entry.js"), sources[kind]);
      const server = await createServer({
        configFile: false,
        logLevel: "silent",
        plugins: [sqliteBoundary()],
        root,
        server: { middlewareMode: true },
      });
      try {
        await expect(server.ssrLoadModule("/entry.js")).rejects.toThrow(
          "prerender-only",
        );
      } finally {
        await server.close();
        await rm(root, { force: true, recursive: true });
      }
    },
  );

  it("rejects a transitive SQLite import at build time before deploying", async () => {
    const root = await mkdtemp(Path.join(tmpdir(), "nbastt-boundary-build-"));
    await mkdir(Path.join(root, "data/node"), { recursive: true });
    await writeFile(
      Path.join(root, "data/node/database.js"),
      'export const value = "SQLITE_NODE_ONLY";',
    );
    await writeFile(
      Path.join(root, "entry.js"),
      'export { value } from "./data/node/database.js";',
    );
    try {
      await expect(
        build({
          build: { ssr: Path.join(root, "entry.js"), write: false },
          configFile: false,
          logLevel: "silent",
          plugins: [sqliteBoundary()],
          root,
        }),
      ).rejects.toThrow("prerender-only");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
