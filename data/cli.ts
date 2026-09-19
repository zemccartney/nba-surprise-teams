import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { getCurrentEasternYYYYMMDD } from "../src/data/calendar.ts";
import {
  applyChanges,
  replaceArchive,
  saveOdds,
  saveSeason,
  saveTeam,
  transaction,
} from "./node/commands.ts";
import {
  assertVersion,
  dumpDatabase,
  migrate,
  openDatabase,
  readGames,
  readMetadata,
  restoreDatabase,
  withDatabase,
} from "./node/database.ts";
import { fetchArchive } from "./node/nba-archive.ts";
import { validateDataset } from "./node/validate.ts";

const atomicWrite = (filename: string, contents: string) => {
  const temporary = filename + ".tmp-" + randomUUID();
  try {
    writeFileSync(temporary, contents, { flag: "wx" });
    renameSync(temporary, filename);
  } finally {
    rmSync(temporary, { force: true });
  }
};

async function main(): Promise<void> {
  const here = fileURLToPath(new URL("./", import.meta.url));
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      all: { default: false, type: "boolean" },
      db: { default: Path.join(here, "tracker.db"), type: "string" },
      debug: { default: false, type: "boolean" },
      dump: { default: Path.join(here, "dump.sql"), type: "string" },
      input: { type: "string" },
      latest: { default: false, type: "boolean" },
      output: { type: "string" },
      "over-under": { type: "string" },
      season: { type: "string" },
      team: { type: "string" },
    },
  });
  assert.equal(
    positionals.length,
    1,
    "Supply a data command; see data/README.md",
  );
  const [command] = positionals;
  const database = Path.resolve(values.db),
    dumpFile = Path.resolve(values.dump);
  const notify = () =>
    writeFileSync(database + ".revision", randomUUID() + "\n");
  const required = (value: string | undefined, name: string) => {
    assert.ok(value, `Supply --${name}`);
    return value;
  };
  const input = (): unknown =>
    JSON.parse(readFileSync(required(values.input, "input"), "utf8"));
  if (command === "restore") {
    restoreDatabase(database, readFileSync(dumpFile, "utf8"), validateDataset);
    notify();
    console.log(
      `Restored ${database}; existing databases are never overwritten`,
    );
  } else if (command === "check" || command === "check-staged") {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();
    const expected =
      command === "check-staged"
        ? execFileSync(
            "git",
            [
              "show",
              ":" +
                Path.relative(
                  realpathSync(repo),
                  Path.join(
                    realpathSync(Path.dirname(dumpFile)),
                    Path.basename(dumpFile),
                  ),
                ),
            ],
            {
              cwd: repo,
              encoding: "utf8",
              maxBuffer: 16 * 1024 * 1024,
            },
          )
        : readFileSync(dumpFile, "utf8");
    const temporary = mkdtempSync(Path.join(tmpdir(), "nbastt-check-"));
    try {
      const filename = Path.join(temporary, "check.db");
      restoreDatabase(filename, expected);
      withDatabase(filename, (db) => {
        validateDataset(db);
        assert.equal(dumpDatabase(db), expected, "Dump is not canonical");
      });
      if (existsSync(database))
        assert.ok(
          withDatabase(database, dumpDatabase) === expected,
          `SQLite dump drift (${command}). Run mise run data:dump and review the SQL${command === "check-staged" ? ", then stage it" : ""}.`,
        );
      console.log(
        existsSync(database)
          ? `${command}: valid dump matches database`
          : `${command}: dump restored and validated; no local DB for drift comparison`,
      );
    } finally {
      rmSync(temporary, { force: true, recursive: true });
    }
  } else {
    const writes = new Set([
      "add-season",
      "add-team",
      "add-team-season",
      "apply",
      "archive-nba",
      "import-archive",
      "migrate",
      "remove-team-season",
      "update-odds",
      "update-season",
      "update-team",
    ]);
    const db = openDatabase(database, !writes.has(command ?? ""));
    try {
      if (command !== "migrate") assertVersion(db);
      if (command === "migrate") {
        migrate(db);
        notify();
      } else if (command === "archive-nba") {
        const metadata = readMetadata(db);
        const eligible = metadata.seasons
          .filter((s) => s.endDate < getCurrentEasternYYYYMMDD())
          .map((s) => s.id)
          .toSorted((a, b) => a.localeCompare(b));
        assert.equal(
          Number(Boolean(values.season)) +
            Number(values.latest) +
            Number(values.all),
          1,
          "Choose --season, --latest or --all",
        );
        const ids = values.all
          ? eligible
          : [
              required(
                values.latest ? eligible.at(-1) : values.season,
                "season",
              ),
            ];
        // Fetch everything before opening the write transaction. Failure publishes nothing.
        const archives: {
          games: Awaited<ReturnType<typeof fetchArchive>>;
          id: string;
        }[] = [];
        for (const id of ids) {
          assert.ok(
            eligible.includes(id),
            "Only completed seasons can be archived",
          );
          archives.push({ games: await fetchArchive(id, metadata), id });
        }
        transaction(db, () => {
          for (const archive of archives)
            replaceArchive(db, archive.id, archive.games);
        });
        notify();
        console.log(
          `Archived ${ids.join(", ")}; run data:dump to publish to Git`,
        );
      } else if (writes.has(command ?? "")) {
        transaction(db, () => {
          switch (command) {
            case "add-season":
            case "update-season": {
              saveSeason(db, input(), command === "update-season");
              break;
            }
            case "add-team":
            case "update-team": {
              saveTeam(db, input(), command === "update-team");
              break;
            }
            case "add-team-season":
            case "update-odds": {
              saveOdds(
                db,
                required(values.season, "season"),
                required(values.team, "team"),
                required(values["over-under"], "over-under"),
                command === "update-odds",
              );
              break;
            }
            case "apply": {
              applyChanges(db, input());
              break;
            }
            case "import-archive": {
              replaceArchive(db, required(values.season, "season"), input());
              break;
            }
            case "remove-team-season": {
              assert.equal(
                db
                  .prepare(
                    "DELETE FROM team_seasons WHERE season_id=? AND team_id=?",
                  )
                  .run(
                    required(values.season, "season"),
                    required(values.team, "team"),
                  ).changes,
                1,
                "No such team season",
              );
              break;
            }
          }
        });
        notify();
        console.log(
          `${command}: committed and dev notified; run data:dump to publish to Git`,
        );
      } else
        switch (command) {
          case "dump": {
            atomicWrite(dumpFile, dumpDatabase(db, validateDataset));
            console.log(`Wrote ${dumpFile}; review and stage it`);
            break;
          }
          case "export": {
            const result = values.season
              ? readGames(db, values.season)
              : readMetadata(db);
            const json = JSON.stringify(result, undefined, 2) + "\n";
            if (values.output)
              writeFileSync(values.output, json, { flag: "wx" });
            else console.log(json);
            break;
          }
          case "latest-season": {
            console.log(
              readMetadata(db).seasons.toSorted((a, b) =>
                b.id.localeCompare(a.id),
              )[0]?.id,
            );
            break;
          }
          case "list-team-seasons": {
            const season = required(values.season, "season");
            assert.ok(
              readMetadata(db).seasons.some((s) => s.id === season),
              "Unknown season",
            );
            console.table(
              readMetadata(db).teamSeasons.filter((t) => t.seasonId === season),
            );
            break;
          }
          case "notify": {
            validateDataset(db);
            notify();
            console.log("Dev notified; preview remains fixed until rebuild");
            break;
          }
          case "validate": {
            validateDataset(db);
            console.log("Integrity, domain, assets and lifecycle: OK");
            break;
          }
          default: {
            throw new Error(`Unknown data command ${command}`);
          }
        }
    } finally {
      db.close();
    }
  }
}

// Keep expected command failures readable; finally blocks finish before exiting.
try {
  await main();
} catch (error) {
  console.error(
    process.argv.includes("--debug")
      ? error
      : error instanceof Error
        ? error.message
        : String(error),
  );
  process.exitCode = 1;
}
