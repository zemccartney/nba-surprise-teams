/* eslint unicorn/no-this-outside-of-class: "off" -- Vite supplies the real plugin context as this. */
import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { fileURLToPath } from "node:url";

import { openDatabase, readMetadata, restoreDatabase } from "./database.ts";

const { relative, resolve } = Path;
const here = fileURLToPath(new URL("./", import.meta.url));
const publicCatalog = "virtual:tracker/catalog";
const publicArchive = "virtual:tracker/archive";
const catalogId = "\0sqlite-pilot:catalog";
const archiveId = "\0sqlite-pilot:archive";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

export default function sqlitePilot(): AstroIntegration {
  let database = resolve(here, "data/tracker.db");
  let buildDirectory: string | undefined;
  let outputDirectory = resolve(here, "../../dist");
  const reports: {
    directory: string;
    report: {
      chunks: { file: string; sha256: string }[];
      environment: string;
      forbiddenMatches: string[];
      imports: string[];
      modules: string[];
      note: string;
    };
  }[] = [];
  const plugin: Plugin = {
    config() {
      // Runtime DB I/O must not become source HMR. Our explicit revision marker
      // handles supported writes; external SQL editors require `data:notify`.
      return {
        server: {
          watch: {
            ignored: [
              database,
              database + "-wal",
              database + "-shm",
              database + "-journal",
            ],
          },
        },
      };
    },
    configEnvironment() {
      // Each environment's scanner also visits prerender source files. These
      // are virtual application modules, never packages to prebundle.
      return { optimizeDeps: { exclude: [publicCatalog, publicArchive] } };
    },
    configureServer(server) {
      const revision = database + ".revision";
      server.watcher.add(revision);
      const update = (filename: string) => {
        if (filename !== revision) return;
        for (const environment of Object.values(server.environments)) {
          const mod = environment.moduleGraph.getModuleById(catalogId);
          if (mod) environment.moduleGraph.invalidateModule(mod);
          environment.hot.send({ type: "full-reload" });
        }
      };
      server.watcher.on("change", update);
      server.watcher.on("add", update);
      server.httpServer?.once("close", () => {
        server.watcher.off("change", update);
        server.watcher.off("add", update);
      });
    },
    enforce: "pre",
    generateBundle(_options, bundle) {
      const environment = this.environment.name;
      if (environment === "prerender") return;
      const chunks = Object.values(bundle).filter(
        (entry) => entry.type === "chunk",
      );
      const forbidden =
        /(?:node:sqlite|SQLITE_PILOT_NODE_ONLY|sqlite-spike\/database\.ts)/;
      const modules = chunks.flatMap((chunk) => Object.keys(chunk.modules));
      const imports = [
        ...new Set(
          modules.flatMap((id) => {
            const info = this.getModuleInfo(id);
            return [
              ...(info?.importedIds ?? []),
              ...(info?.dynamicallyImportedIds ?? []),
            ];
          }),
        ),
      ];
      for (const value of [
        ...modules,
        ...imports,
        ...chunks.map((chunk) => chunk.code),
      ]) {
        if (forbidden.test(value))
          throw new Error(`SQLite machinery leaked into ${environment}`);
      }
      if (!_options.dir)
        throw new Error("Expected a directory build for the SQLite audit");
      const report = {
        chunks: chunks.map((chunk) => ({
          file: chunk.fileName,
          sha256: hash(chunk.code),
        })),
        environment,
        forbiddenMatches: [],
        imports: imports.filter(
          (id) => id.startsWith("node:") || id.includes("sqlite"),
        ),
        modules: modules.filter(
          (id) => id.includes("sqlite-pilot") || id.includes("sqlite-spike"),
        ),
        note: "Pilot boundary only. Existing Astro content-store archives remain until the full migration.",
      };
      reports.push({ directory: resolve(_options.dir), report });
    },
    load(id) {
      if (id !== catalogId && id !== archiveId) return;
      if (this.environment.name === "prerender") {
        return `import { fileCatalog, withDatabase, readGames } from ${JSON.stringify(resolve(here, "database.ts"))};
const filename = ${JSON.stringify(database)};
export const catalog = fileCatalog(filename);
export const backend = "sqlite";
export const getArchivedGames = (seasonId, teamId) => withDatabase(filename, db => readGames(db, seasonId, teamId));`;
      }
      const db = openDatabase(database);
      let metadata;
      try {
        metadata = readMetadata(db);
      } finally {
        db.close();
      }
      const json = JSON.stringify(metadata);
      return `import { embeddedCatalog } from ${JSON.stringify(resolve(here, "catalog.ts"))};
export const catalog = embeddedCatalog(${json});
export const backend = "embedded metadata";
export const metadataHash = ${JSON.stringify(hash(json))};`;
    },
    name: "sqlite-pilot-environment-boundary",
    resolveId(id) {
      if (id !== publicCatalog && id !== publicArchive) return;
      if (this.environment.name === "client")
        throw new Error("Pilot data must never enter a browser module");
      if (id === publicArchive && this.environment.name !== "prerender")
        throw new Error(
          `Archive SQL requested outside Node prerender: ${this.environment.name}`,
        );
      return id === publicCatalog ? catalogId : archiveId;
    },
  };
  return {
    hooks: {
      "astro:build:done": () => {
        // Astro rewrites its manifest after Rollup. Seal the final files, not
        // generateBundle's provisional bytes. Reports stay outside assets/server.
        mkdirSync(outputDirectory, { recursive: true });
        for (const { directory, report } of reports) {
          // Astro inlines and removes small client entries after bundling. Their
          // source graph/code was checked above; the independent audit also
          // scans the final HTML. Worker chunks must all remain present.
          if (report.environment === "client")
            report.chunks = report.chunks.filter((chunk) =>
              existsSync(resolve(directory, chunk.file)),
            );
          for (const chunk of report.chunks) {
            const filename = resolve(directory, chunk.file);
            const code = readFileSync(filename, "utf8");
            if (
              /(?:node:sqlite|SQLITE_PILOT_NODE_ONLY|sqlite-spike\/database\.ts)/.test(
                code,
              )
            )
              throw new Error(`SQLite reference in final artifact ${filename}`);
            chunk.sha256 = hash(code);
            chunk.file = relative(outputDirectory, filename);
          }
          writeFileSync(
            resolve(
              outputDirectory,
              `sqlite-pilot-audit-${report.environment}.json`,
            ),
            JSON.stringify(report, undefined, 2) + "\n",
          );
        }
        if (buildDirectory)
          rmSync(buildDirectory, { force: true, recursive: true });
      },
      "astro:config:done": ({ config }) => {
        outputDirectory = fileURLToPath(config.outDir);
      },
      "astro:config:setup": ({ command, updateConfig }) => {
        if (command === "build") {
          buildDirectory = mkdtempSync(
            resolve(tmpdir(), "nbastt-sqlite-build-"),
          );
          database = resolve(buildDirectory, "snapshot.db");
          restoreDatabase(
            database,
            readFileSync(resolve(here, "data/dump.sql"), "utf8"),
          );
        }
        updateConfig({ vite: { plugins: [plugin] } });
      },
    },
    name: "sqlite-pilot",
  };
}
