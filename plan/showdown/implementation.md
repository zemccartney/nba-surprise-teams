# Showdown implementation and review

Original base: `cf97135221eefe719ecfd2fabe8ee27745696b85`; branch `feature/showdown`.
Fast-forwarded to completed production `main` (`0bac673`) before opening the
checkpoint-1 PR; full build/verification passed with 225 tests.
Worktree: `../nba-surprise-teams-showdown`. Production checkout stays untouched.

## Approved scope

- `/{seasonId}/showdown/` for every season with candidates.
- Homepage link only under the same `isSeasonReady` condition as standings.
- Season-detail link beside episode link, also present without an episode.
- Large season-scoped back link; no previous/next Showdown links (review revision).
- SHOWDOWN plus abbreviated season in the title, supplied SVG, accessible blood-red accent.
- All preseason candidates participate regardless of subsequent result.
- W/L/PCT standings, shared ranks for equal percentages; alphabetical ties;
  teams without games last with an em dash.
- Date-grouped chronological calendar; away @ home, scores beneath emoji.
- Upcoming games and jump-to-next shortcut; unfinished scores never zero-filled.
- Optional full schedule from live loader; completed games contract preserved.
  Schedule-aware cache handling; same upstream fetch for results and schedule.
- Explicit home/away identities in live/archive data. Historical MATCHUP carries
  `@` / `vs.`; preserve it, verify paired rows, backfill without altering results.
  Unknown venues use `vs.` rather than inventing home/away.
- Bottom-row Stats chart: archived seasons only, aggregate W/L before PCT,
  existing franchise grouping, all teams including no-game entries.
- Purple question-mark beside the title opens an explanatory modal (review revision).
  No inline explanatory copy, standings/matchup section headings, or Final labels.
  Use the shared Table component. Date headers get one continuous rule; no card borders.
  Scores are final results only, never in-progress scores; upcoming fixtures remain unscored.
  Season detail links have wider spacing and stack on narrow screens.
  Red selected at visual checkpoint.

## Review checkpoints

1. Visual slice: historical page, art, palette, standings, calendar, navigation;
   desktop/mobile local review. Unknown venues explicitly remain `vs.` until
   backfill. Current-season schedule is not part of this checkpoint.
2. Complete feature: schema/import/backfill, live schedule/cache, Stats chart,
   empty/loading/error states, regression tests.
3. Merge-ready: integrate completed production work, full verification/build,
   review walkthrough and limitations. No production publishing from this branch.

## Validation

Pure selection/ranking tests; historical importer venue validation and invariant
checks; schedule selection/status/cache tests; route/navigation visibility checks;
Astro check, formatting/lint, full tests and build before merge. Do not run dev
concurrently with sync/build/tests in this checkout.
