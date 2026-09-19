import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, expect, it } from "vitest";

const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-cli-"));
const database = Path.join(directory, "db");
const cli = (...args: string[]) =>
  spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../data/cli.ts", import.meta.url)),
      ...args,
      "--db",
      database,
    ],
    { encoding: "utf8" },
  );
afterAll(() => rmSync(directory, { force: true, recursive: true }));

it("reports parser errors without Node's stack/footer and offers debug output", () => {
  const normal = cli("validate", "--not-a-real-option");
  expect(normal.status).toBe(1);
  expect(normal.stderr).toContain("Unknown option");
  expect(normal.stderr).not.toMatch(/node:internal|Node\.js v|\n\s+at /);
  const debug = cli("validate", "--not-a-real-option", "--debug");
  expect(debug.status).toBe(1);
  expect(debug.stderr).toContain("node:internal");
});

it("reports missing DB failures concisely without creating a DB", () => {
  const filename = Path.join(directory, "missing.db");
  const missing = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../data/cli.ts", import.meta.url)),
      "validate",
      "--db",
      filename,
    ],
    { encoding: "utf8" },
  );
  expect(existsSync(filename)).toBe(false);
  expect(missing.status).toBe(1);
  expect(missing.stderr).toContain("Missing database");
  expect(missing.stderr).not.toMatch(/node:internal|Node\.js v|\n\s+at /);
});

it("round-trips an offline archive through the renamed command", () => {
  expect(cli("restore").status).toBe(0);
  const json = Path.join(directory, "games.json");
  expect(cli("export", "--season", "2025", "--output", json).status).toBe(0);
  expect(
    cli("import-archive", "--season", "2025", "--input", json).status,
  ).toBe(0);
  expect(cli("validate").status).toBe(0);
  // SQLite may rearrange pages on replacement; compare canonical output, not bytes.
  const output = Path.join(directory, "dump.sql");
  expect(cli("dump", "--dump", output).status).toBe(0);
  expect(readFileSync(output, "utf8")).toBe(
    readFileSync(new URL("../data/dump.sql", import.meta.url), "utf8"),
  );
});
