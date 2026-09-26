import type { DatabaseSync } from "node:sqlite";

import assert from "node:assert/strict";

import { type Game, gameSchema } from "../../src/data/model.ts";
import { readGames, writeVenue } from "./database.ts";

const sorted = (scores: Game["teams"]) =>
  scores.toSorted((a, b) => a.teamId.localeCompare(b.teamId));

/**
Enrich only venue metadata. Any score/identity/date discrepancy aborts rather than
silently replacing approved results. Caller owns the transaction and validation.
*/
export function backfillVenues(
  db: DatabaseSync,
  seasonId: string,
  source: Game[],
): void {
  const stored = readGames(db, seasonId);
  assert.ok(stored.length, `No archive to enrich for ${seasonId}`);
  const games = source.map((game) => gameSchema.parse(game));
  const byId = new Map(games.map((game) => [game.id, game]));
  assert.equal(byId.size, games.length, "Duplicate venue source games");
  assert.equal(
    games.length,
    stored.length,
    "Venue source must cover the exact archive",
  );
  for (const game of stored) {
    const next = byId.get(game.id);
    assert.ok(next?.venue, `Missing venue for ${game.id}`);
    assert.equal(next.seasonId, seasonId, "Venue source season mismatch");
    assert.equal(next.playedOn, game.playedOn, "Venue source date mismatch");
    assert.equal(
      next.nbaGameId,
      game.nbaGameId,
      "Venue source NBA identity mismatch",
    );
    assert.deepEqual(
      sorted(next.teams),
      sorted(game.teams),
      `Venue source score/team mismatch: ${game.id}`,
    );
    if (game.venue)
      assert.deepEqual(
        next.venue,
        game.venue,
        `Existing venue conflict: ${game.id}`,
      );
  }
  for (const game of games) {
    assert.ok(game.venue);
    writeVenue(db, game.id, game.venue);
  }
}
