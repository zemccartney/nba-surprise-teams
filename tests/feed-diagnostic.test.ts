import { spawnSync } from "node:child_process";
import Fs from "node:fs/promises";
import Os from "node:os";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { inspectNbaFeed } from "../scripts/check-nba-feed";

const game = (gameId = "0012600009") => ({
  awayTeam: { score: 0, teamTricode: "MIA" },
  gameDateTimeUTC: "2026-10-03T23:00:00Z",
  gameId,
  gameLabel: "Preseason",
  gameStatus: 1,
  homeTeam: { score: 0, teamTricode: "TOR" },
});
const payload = (games: unknown[] = [game()]) => ({
  leagueSchedule: {
    gameDates: [{ gameDate: "10/03/2026 00:00:00", games }],
    seasonYear: "2026-27",
  },
});

describe("standalone feed observations", () => {
  it("accepts noncontiguous IDs", () => {
    const report = inspectNbaFeed(
      payload([game(), game("0012600067")]),
      "2026-27",
    );
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.firstPreseason?.startUTC).toBe("2026-10-03T23:00:00Z");
  });
  it("reports malformed feeds and identity conflicts", () => {
    expect(() => inspectNbaFeed({})).toThrow("gameDates");
    const report = inspectNbaFeed(payload([game(), game()]), "2025-26");
    expect(report.errors).toHaveLength(2);
  });
  it("flags live scores for review", () => {
    const ongoing = {
      ...game(),
      awayTeam: { score: 49, teamTricode: "MIA" },
      gameStatus: 2,
    };
    const report = inspectNbaFeed(payload([ongoing]), "2026-27");
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([
      expect.stringContaining("scores present without status 3"),
    ]);
    expect(report.statuses).toEqual({ 2: 1 });
  });
  it("warns on changed championship labels", () => {
    const cup = {
      ...game("0062600001"),
      gameLabel: "New sponsor",
      gameSubLabel: "Championship",
      gameSubtype: "in-season-knockout",
      seriesText: "Neutral Site",
    };
    const report = inspectNbaFeed(payload([cup]), "2026-27");
    expect(report.errors).toEqual([]);
    expect(report.championships).toHaveLength(1);
    expect(report.warnings).toEqual([
      expect.stringContaining("championship metadata differs"),
    ]);
  });
  it("rejects empty observations", () => {
    expect(inspectNbaFeed(payload([]), "2026-27").errors).toContain(
      "No usable games: assumptions could not be checked",
    );
  });
});

it("runs offline without overwriting snapshots", async () => {
  const directory = await Fs.mkdtemp(Path.join(Os.tmpdir(), "nbastt-feed-"));
  try {
    const input = Path.join(directory, "input.json");
    const output = Path.join(directory, "saved.json");
    await Fs.writeFile(input, JSON.stringify(payload()));
    const args = [
      fileURLToPath(new URL("../scripts/check-nba-feed.ts", import.meta.url)),
      "--input",
      input,
      "--season",
      "2026-27",
      "--save",
      output,
    ];
    const first = spawnSync(process.execPath, args, { encoding: "utf8" });
    expect(first.status).toBe(0);
    expect(JSON.parse(first.stdout)).toMatchObject({
      errors: [],
      gameCount: 1,
    });
    expect(JSON.parse(await Fs.readFile(output, "utf8"))).toEqual(payload());
    const second = spawnSync(process.execPath, args, { encoding: "utf8" });
    expect(second.status).toBe(1);
    expect(second.stderr).toContain("EEXIST");
    expect(JSON.parse(await Fs.readFile(output, "utf8"))).toEqual(payload());
  } finally {
    await Fs.rm(directory, { force: true, recursive: true });
  }
});
