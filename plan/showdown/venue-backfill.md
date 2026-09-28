# Checkpoint 2a — home/away identities

## Completed

- Optional explicit `venue: { awayTeamId, homeTeamId }` on games. Both teams must
  be distinct and match the game's scored opponents; array order is not a venue.
- SQLite migration 3 adds `archived_game_venues` keyed to existing game IDs.
  Separate enrichment table keeps approved score/date/team rows unchanged and
  preserves compatibility with genuinely unknown venues. Archive replacement
  cascades removal of associated venue rows.
- Historical importer preserves `@`/`vs.` and validates paired assignments.
- Live loader preserves explicit NBA home/away fields and bumps its cache version.
- Showdown renders away @ home when known, otherwise honest vs. fallback.
- `node data/cli.ts archive-venues --season 2025` (or `--all`) enriches existing
  archives only. Exact game coverage, identities, dates and scores must match;
  existing venue conflicts abort. All requested sources are fetched before
  the transaction. Run `data:dump` to publish intentional changes.

## Backfill evidence

All **18,607 archived games across 29 seasons** were enriched from NBA sources.
Canonical result rows, IDs, scores and team order are unchanged; the historical
score/chart parity tests remain intact. Initial curl attempts timed out, but the
Node importer subsequently fetched the feeds successfully. No network in tests
or builds.

One upstream inconsistency required independent verification:

- Game `0022400147`, 2024-11-02, MIA 118 / WAS 98, Arena CDMX, Mexico City.
- NBA league game log says both `MIA @ WAS` and `WAS @ MIA`.
- NBA official box score specifies **MIA away, WAS home**, with matching scores:
  `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_0022400147.json`.
- Importer now resolves paired venue conflicts only via this official box-score
  endpoint, validating provider ID, both team identities and both scores before
  accepting the venue. Ordinary decoding remains strict; an unavailable or
  disagreeing box score aborts instead of guessing. This is not a hardcoded
  team/date correction.

## Local checkout migration

On an existing working database: back up first, `node data/cli.ts migrate`, then
backfill and dump if editing locally. To consume the canonical enriched dump
without refetching, restore it into a new local database; do not overwrite a
working database containing unpublished editorial changes. Builds restore the
committed dump in isolation as usual.

## Next

Upcoming schedules/cache handling and the archived-only Stats chart.
