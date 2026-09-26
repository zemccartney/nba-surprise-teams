import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { backfillVenues } from "../data/node/backfill-venues";
import { migrate, readGames, writeGame } from "../data/node/database";
import { type Game, gameSchema } from "../src/data/model";
import { showdownOpponents } from "../src/data/showdown";

const game: Game = {
  id: "2025-11-01/ATL__CHA",
  nbaGameId: "0022500001",
  playedOn: "2025-11-01",
  seasonId: "2025",
  teams: [
    { score: 99, teamId: "ATL" },
    { score: 101, teamId: "CHA" },
  ],
};
const enriched: Game = {
  ...game,
  venue: { awayTeamId: "CHA", homeTeamId: "ATL" },
};
function fixture(run: (db: DatabaseSync) => void) {
  const db = new DatabaseSync(":memory:");
  try {
    migrate(db);
    db.exec(
      "INSERT INTO teams VALUES ('ATL','Atlanta','a'),('CHA','Charlotte','b'); INSERT INTO seasons(id,start_date,end_date) VALUES ('2025','2025-10-01','2026-04-30');",
    );
    writeGame(db, game);
    run(db);
  } finally {
    db.close();
  }
}

describe("Showdown venue enrichment", () => {
  it("round-trips venues without changing approved game fields and is idempotent", () =>
    fixture((db) => {
      backfillVenues(db, "2025", [enriched]);
      expect(readGames(db)).toEqual([enriched]);
      backfillVenues(db, "2025", [enriched]);
      expect(readGames(db)).toEqual([enriched]);
    }));
  it("rejects incomplete, duplicate, and score-changing backfills without writes", () =>
    fixture((db) => {
      expect(() => backfillVenues(db, "2025", [])).toThrow("exact archive");
      expect(() => backfillVenues(db, "2025", [enriched, enriched])).toThrow(
        "Duplicate",
      );
      const changed = structuredClone(enriched);
      changed.teams[0].score++;
      expect(() => backfillVenues(db, "2025", [changed])).toThrow(
        "score/team mismatch",
      );
      expect(readGames(db)).toEqual([game]);
    }));
  it("rejects venue corrections disguised as enrichment", () =>
    fixture((db) => {
      backfillVenues(db, "2025", [enriched]);
      expect(() =>
        backfillVenues(db, "2025", [
          { ...enriched, venue: { awayTeamId: "ATL", homeTeamId: "CHA" } },
        ]),
      ).toThrow("Existing venue conflict");
    }));
  it("validates distinct opponents that match the game", () => {
    expect(
      gameSchema.safeParse({
        ...game,
        venue: { awayTeamId: "ATL", homeTeamId: "ATL" },
      }).success,
    ).toBe(false);
    expect(
      gameSchema.safeParse({
        ...game,
        venue: { awayTeamId: "BOS", homeTeamId: "ATL" },
      }).success,
    ).toBe(false);
  });
  it("orders away before home without changing identity/score order; unknown stays unknown", () => {
    expect(showdownOpponents(enriched).map((team) => team.teamId)).toEqual([
      "CHA",
      "ATL",
    ]);
    expect(enriched.teams[0].teamId).toBe("ATL");
    expect(showdownOpponents(game)).toEqual(game.teams);
  });
  it("deletes venue metadata when an archive is replaced", () =>
    fixture((db) => {
      backfillVenues(db, "2025", [enriched]);
      db.prepare("DELETE FROM archived_games WHERE id=?").run(game.id);
      expect(db.prepare("SELECT * FROM archived_game_venues").all()).toEqual(
        [],
      );
    }));
});
