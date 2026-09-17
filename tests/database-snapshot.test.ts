import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { expect, it } from "vitest";

import {
  dumpDatabase,
  openDatabase,
  restoreDatabase,
} from "../data/node/database";
import { validateDataset } from "../data/node/validate";

it("validates and serializes the same snapshot while another connection commits", () => {
  const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-snapshot-"));
  const filename = Path.join(directory, "snapshot.db");
  restoreDatabase(
    filename,
    readFileSync(new URL("../data/dump.sql", import.meta.url), "utf8"),
  );
  const reader = openDatabase(filename, false);
  reader.exec("PRAGMA journal_mode=WAL");
  const writer = openDatabase(filename, false);
  try {
    const before = dumpDatabase(reader, validateDataset);
    const snapshot = dumpDatabase(reader, (db) => {
      validateDataset(db);
      writer
        .prepare("UPDATE teams SET name=? WHERE id='ATL'")
        .run("Concurrent fixture name");
    });
    expect(snapshot).toBe(before);
    expect(dumpDatabase(reader, validateDataset)).not.toBe(before);
  } finally {
    writer.close();
    reader.close();
    rmSync(directory, { force: true, recursive: true });
  }
});
