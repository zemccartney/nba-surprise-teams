import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  dumpDatabase,
  importJson,
  openDatabase,
  restoreDatabase,
  validateDatabase,
} from "./database.ts";

const root = fileURLToPath(new URL("./", import.meta.url));
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    db: { default: Path.resolve(root, "data/tracker.db"), type: "string" },
    dump: { default: Path.resolve(root, "data/dump.sql"), type: "string" },
    "over-under": { type: "string" },
    season: { type: "string" },
    team: { type: "string" },
  },
});
const [command] = positionals;
assert.equal(
  positionals.length,
  1,
  "Supply one data command; see plan/sqlite-spike/README.md",
);
const dbFile = Path.resolve(values.db);
const dumpFile = Path.resolve(values.dump);
const notify = () => writeFileSync(dbFile + ".revision", randomUUID() + "\n");
if (command === "restore") {
  restoreDatabase(dbFile, readFileSync(dumpFile, "utf8"));
  notify();
  console.log(`Restored ${dbFile}; existing databases are never overwritten`);
} else if (command === "bootstrap-json") {
  importJson(
    dbFile,
    fileURLToPath(new URL("../../src/content/", import.meta.url)),
  );
  notify();
  console.log(`Imported current JSON into NEW pilot database ${dbFile}`);
} else if (
  (command === "check" || command === "check-staged") &&
  !existsSync(dbFile)
) {
  console.log(
    "SQLite pilot: no local database; drift comparison skipped. Dump restore is independently tested.",
  );
} else {
  const isWrite = command === "add-team-season" || command === "update-odds";
  const db = openDatabase(dbFile, !isWrite);
  try {
    switch (command) {
      case "add-team-season":
      case "update-odds": {
        assert.ok(
          values.season && values.team && values["over-under"] !== undefined,
          "Supply --season, --team, --over-under",
        );
        assert.match(
          values["over-under"],
          /^\d+(?:\.0|\.5)?$/,
          "Use whole or half wins, e.g. 25 or 25.5",
        );
        const odds = Number(values["over-under"]);
        assert.ok(
          Number.isSafeInteger(odds * 2) && odds >= 0 && odds <= 82,
          "Odds must be whole or half wins between 0 and 82",
        );
        db.exec("BEGIN IMMEDIATE");
        try {
          if (command === "add-team-season")
            db.prepare("INSERT INTO team_seasons VALUES(?,?,?)").run(
              values.season,
              values.team,
              odds * 2,
            );
          else {
            const result = db
              .prepare(
                "UPDATE team_seasons SET over_under_twice=? WHERE season_id=? AND team_id=?",
              )
              .run(odds * 2, values.season, values.team);
            assert.equal(
              result.changes,
              1,
              "No existing team season; use add-team-season explicitly",
            );
          }
          validateDatabase(db);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        console.log(
          `${command}: ${values.season}/${values.team} = ${odds}. Pilot only; existing site JSON has not changed.`,
        );
        break;
      }
      case "check":
      case "check-staged": {
        const expected =
          command === "check-staged"
            ? execFileSync(
                "git",
                ["show", ":plan/sqlite-spike/data/dump.sql"],
                {
                  cwd: Path.resolve(root, "../.."),
                  encoding: "utf8",
                  maxBuffer: 10 * 1024 * 1024,
                },
              )
            : readFileSync(dumpFile, "utf8");
        if (expected !== dumpDatabase(db))
          throw new Error(
            `SQLite pilot dump drift (${command}). Run mise run data:dump, review, then git add ${dumpFile}`,
          );
        console.log(`SQLite pilot ${command}: dump matches local database`);
        break;
      }
      case "dump": {
        const temporary = dumpFile + ".tmp-" + randomUUID();
        writeFileSync(temporary, dumpDatabase(db), { flag: "wx" });
        renameSync(temporary, dumpFile);
        console.log(`Wrote ${dumpFile}; review and stage this SQL file`);
        break;
      }
      case "list-team-seasons": {
        assert.ok(
          values.season,
          "Supply --season (the starting year, e.g. 2026)",
        );
        assert.ok(
          db.prepare("SELECT id FROM seasons WHERE id=?").get(values.season),
          `Unknown season ${values.season}`,
        );
        const rows = db
          .prepare(
            "SELECT team_id AS team, over_under_twice / 2.0 AS overUnder FROM team_seasons WHERE season_id=? ORDER BY over_under_twice, team_id",
          )
          .all(values.season);
        console.log(`Pilot team seasons for ${values.season}: ${rows.length}`);
        console.table(rows);
        break;
      }
      case "notify": {
        validateDatabase(db);
        notify();
        console.log("Notified dev of external database changes");
        break;
      }
      case "validate": {
        validateDatabase(db);
        console.log("SQLite integrity and foreign keys: OK");
        break;
      }
      default: {
        throw new Error(`Unknown data command: ${command}`);
      }
    }
  } finally {
    db.close();
  }
  if (isWrite) notify();
}
