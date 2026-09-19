/* eslint unicorn/no-this-outside-of-class: "off" -- Vite hook context. */
import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";

import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { fileURLToPath } from "node:url";

import { auditArtifacts } from "./node/audit.ts";
import {
  readMetadata,
  restoreDatabase,
  withDatabase,
} from "./node/database.ts";
import { validateDataset } from "./node/validate.ts";
import { assertPrerender, sqliteBoundary } from "./runtime-boundary.ts";

const here = fileURLToPath(new URL("./", import.meta.url));
const catalogId = "\0tracker:catalog";
const archiveId = "\0tracker:archive";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

export default function trackerData(): AstroIntegration {
  let database = Path.join(here, "tracker.db");
  let buildDirectory: string | undefined;
  let output = "";
  const plugin: Plugin = {
    // Vite: DB writes are not reload signals; only explicit revision notifications are.
    config() {
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
    // Vite: keep generated application modules out of each environment's dependency optimizer.
    configEnvironment() {
      return {
        optimizeDeps: {
          exclude: ["virtual:tracker/catalog", "virtual:tracker/archive"],
        },
      };
    },
    // Vite dev only: validate the working DB and refresh all server graphs on notification.
    configureServer(server) {
      withDatabase(database, validateDataset);
      const revision = database + ".revision";
      server.watcher.add(revision);
      const update = (filename: string) => {
        if (filename !== revision) return;
        for (const environment of Object.values(server.environments)) {
          // Invalidate importers too: cached route getStaticPaths must refresh.
          const module = environment.moduleGraph.getModuleById(catalogId);
          if (module) environment.moduleGraph.invalidateModule(module);
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
    // Vite: supply source for resolved virtual imports, using the selected database.
    load(id) {
      if (id === archiveId) {
        assertPrerender(this.environment.name, id);
        return `import { withDatabase, readGames } from ${JSON.stringify(Path.join(here, "node/database.ts"))};
import { catalog } from "virtual:tracker/catalog";
const filename = ${JSON.stringify(database)};

export const getArchivedGames = (seasonId) =>
  withDatabase(filename, db => readGames(db, seasonId));

export const getSeasonArchive = (seasonId) => {
  const games = getArchivedGames(seasonId);
  return games.length ? games : undefined;
};

export const getArchivedSeasons = () => {
  const rows = withDatabase(filename, db =>
    db.prepare("SELECT DISTINCT season_id FROM archived_games").all()
  );
  const ids = new Set(rows.map(row => row.season_id));
  return catalog.getSeasons()
    .filter(season => ids.has(season.id))
    .toSorted((a, b) => b.id.localeCompare(a.id));
};`;
      }
      if (id !== catalogId) return;
      // One metadata snapshot per module generation in both server environments.
      // Only explicit notifications regenerate dev modules; builds are immutable.
      const json = JSON.stringify(withDatabase(database, readMetadata));
      return `import { metadataCatalog } from ${JSON.stringify(Path.join(here, "../src/data/catalog.ts"))};
export const catalog = metadataCatalog(${json});
export const metadataHash = ${JSON.stringify(hash(json))};`;
    },
    name: "tracker-data",
    // Vite: map public virtual names to internal IDs and reject disallowed environments.
    resolveId(id) {
      if (id !== "virtual:tracker/catalog" && id !== "virtual:tracker/archive")
        return;
      if (this.environment.name === "client")
        throw new Error(
          "Tracker metadata belongs on the server; pass only presentation data to charts",
        );
      if (id === "virtual:tracker/archive")
        assertPrerender(this.environment.name, id);
      return id === "virtual:tracker/catalog" ? catalogId : archiveId;
    },
  };
  return {
    hooks: {
      // Astro: seal and audit final deployable artifacts, then release the build snapshot.
      "astro:build:done": () => {
        const files: { file: string; sha256: string }[] = [];
        const walk = (directory: string) => {
          const entries = readdirSync(directory, { withFileTypes: true });
          for (const entry of entries) {
            const filename = Path.join(directory, entry.name);
            if (entry.isDirectory()) {
              walk(filename);
              continue;
            }
            if (/\.(?:db|sqlite|sql)(?:$|[-.])/.test(entry.name))
              throw new Error(`Deployable database artifact: ${filename}`);
            if (!/\.(?:m?js|html|map)$/.test(entry.name)) continue;
            const code = readFileSync(filename, "utf8");
            if (
              /node:sqlite|data\/node\/database|sqlite_schema|INSERT INTO "archived_games"/.test(
                code,
              )
            )
              throw new Error(`SQL machinery in final artifact ${filename}`);
            files.push({
              file: Path.relative(output, filename),
              sha256: hash(code),
            });
          }
        };
        walk(Path.join(output, "client"));
        walk(Path.join(output, "server"));
        writeFileSync(
          Path.join(output, "data-audit.json"),
          JSON.stringify(
            {
              files,
              metadataHash: hash(
                JSON.stringify(withDatabase(database, readMetadata)),
              ),
            },
            undefined,
            2,
          ) + "\n",
        );
        auditArtifacts(output);
        if (buildDirectory)
          rmSync(buildDirectory, { force: true, recursive: true });
      },
      // Astro: consume resolved paths and let Astro manage generated virtual-module types.
      "astro:config:done": ({ config, injectTypes }) => {
        output = fileURLToPath(config.outDir);
        const source = readFileSync(
          new URL("virtual.d.ts", import.meta.url),
          "utf8",
        );
        injectTypes({
          // Generated files live under .astro, not beside this declaration source.
          content: source.replaceAll(
            /"(\.\.\/src\/data\/[^"]+)"/g,
            (_match, relative: string) =>
              JSON.stringify(
                fileURLToPath(new URL(relative, import.meta.url)).replaceAll(
                  "\\",
                  "/",
                ),
              ),
          ),
          filename: "virtual.d.ts",
        });
      },
      // Astro: choose working versus canonical-snapshot DB before registering Vite plugins.
      "astro:config:setup": ({ command, updateConfig }) => {
        if (command === "build" || command === "sync") {
          buildDirectory = mkdtempSync(
            Path.join(tmpdir(), "nbastt-data-build-"),
          );
          database = Path.join(buildDirectory, "snapshot.db");
          restoreDatabase(
            database,
            readFileSync(Path.join(here, "dump.sql"), "utf8"),
          );
          withDatabase(database, validateDataset);
          const cleanupDirectory = buildDirectory;
          process.once("exit", () =>
            rmSync(cleanupDirectory, { force: true, recursive: true }),
          );
        }
        updateConfig({ vite: { plugins: [plugin, sqliteBoundary()] } });
      },
    },
    name: "tracker-data",
  };
}
