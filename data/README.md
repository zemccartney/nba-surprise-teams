# Tracker data store

**Active application storage.** Astro orchestrates the UI; SQLite owns historical
and editorial data. Start with the [visual architecture guide](../docs/data-system.html).
There are no Astro content collections, JSON archives, runtime SQL services or
new database dependencies. Node 26 supplies `node:sqlite`.

## Three distinct environments

| Context                     | Metadata                               | Archived games                     | Current games           |
| --------------------------- | -------------------------------------- | ---------------------------------- | ----------------------- |
| Dev Node prerender          | Snapshot generated from working DB     | Read-only SQL, short-lived handles | Deferred island         |
| Dev workerd islands/actions | Same generated metadata                | Forbidden                          | NBA schedule + local KV |
| Build Node prerender        | Fresh DB restored from Git SQL         | Read-only SQL                      | No NBA request          |
| Built/hosted Worker         | Embedded metadata, fixed until rebuild | Forbidden                          | NBA schedule + KV       |
| Browser                     | Rendered HTML/chart presentation data  | No database or SQL                 | Island response         |

`virtual:tracker/catalog` exports plain metadata lookups. It contains all teams,
seasons and team seasons (including opponents and historical names), **not games**.
`virtual:tracker/archive` provides archived games/seasons only in Node prerender.
Shared `ui.astro` components use metadata and pure calculations, never archives.
The wrapper `index.astro` chooses static data or `ssr.astro` with `server:defer`.

## Daily workflow

```sh
mise run data:restore                  # once per checkout; refuses overwrite
mise x -- pnpm exec astro dev --port 4340
mise run data -- list-team-seasons --season 2026
mise run data -- add-team-season --season 2026 --team CHA --over-under 25.5
mise run data -- update-odds --season 2026 --team CHA --over-under 26.5
mise run data -- remove-team-season --season 2026 --team CHA
mise run data:dump                     # validate, write deterministic SQL
mise run data:check                    # restore SQL, validate, check DB drift
```

The odds above are **fictitious review examples**, not actual 2026 odds. Supported
mutations are transactional, fail without notification on error, and notify dev
only after commit. Adds never silently replace existing rows; updates fail if
absent. Removing a historical candidate fails if it invalidates its archive.

`data/tracker.db` is ignored local working state; `data/dump.sql` is the canonical
reviewable Git artifact. Stage the dump explicitly. Pre-commit compares the
**actual staged blob**, not just the working file, against the database. With no
local DB, checks still restore and validate the dump; only drift comparison is
skipped. A build restores the working-tree dump into a temporary database and
ignores local DB edits. A clean deployment checkout thus builds committed bytes.

External SQL editors are supported. Finish/commit the edit, then run
`mise run data:notify`. File writes alone deliberately do not refresh metadata.
Notification validates the database, invalidates catalog modules in both server
environments and reloads connected browsers. This also regenerates static route
paths. Archive SQL is read afresh on a Node request; metadata remains a snapshot
until notification. **Preview never follows local DB changes**: dump and rebuild.
Do not run dev and build/typecheck/test concurrently in the same checkout.

## Editing teams and seasons

`mise run data -- export` prints plain metadata JSON; `--output /tmp/metadata.json`
writes a new file without overwriting. Extract/edit one record, then use:

```sh
mise run data -- add-season --input /tmp/season.json
mise run data -- update-season --input /tmp/season.json
mise run data -- add-team --input /tmp/team.json
mise run data -- update-team --input /tmp/team.json
```

Updates replace the **complete record**, including optional fields and historical
names. Shapes live in `src/data/model.ts`. Season IDs are starting years; dates
are ISO calendar dates. Episode date/title/URL are supplied together. Team emoji
and historical logo names must resolve to checked-in SVGs. Brand-new NBA codes
also require adding the code to `src/loaders/live/utils.ts` and the corresponding
asset before adding metadata. Team-season odds must be whole/half wins and below
the season's scaled candidate cutoff. Historical display ordering is explicit;
new candidate rows append, while tables still apply their usual pace sorting.

### Atomic backfills and multi-record corrections

For a historical season, adding metadata alone would correctly fail completeness
validation. Use `mise run data -- apply --input /tmp/changes.json` to apply an
ordered array of `{ "command": "add-season", "record": { ... } }` operations in
one transaction. Supported commands are add/update season, add/update team,
add-team-season/update-odds (plain `TeamSeason` record), and `archive` (record:
`{ "seasonId": "1994", "games": [...] }`). Add parents before children. Validation
runs on the complete result; a failure rolls everything back and does not notify
dev. This avoids weakening lifecycle checks to permit temporary incomplete data.

## Archiving

```sh
mise x -- pnpm run archive:latest     # explicit NBA historical request + DB write
# Or one selected season:
mise run data -- archive-nba --season 2025
# Offline import of normalized Game[] (e.g. export/review/correction):
mise run data -- export --season 2025 --output /tmp/games.json
mise run data -- archive --season 2025 --input /tmp/games.json
mise run data:dump
mise x -- pnpm run archive:diff       # ordinary readable SQL Git diff
```

`archive:all` explicitly refetches all ended seasons; it is not routine maintenance.
The historical importer runs directly in Node, with a 10-second request timeout
and NBA Referer. It pairs both team rows, rejects missing/duplicate/conflicting
rows, preserves provider IDs when supplied, and normalizes legacy tricodes.
All requested feeds are fetched before one write transaction. Replacing archives
validates date windows, candidate participation, identities and complete per-team
game counts; failure restores the previous archive. No network access occurs in
builds/tests. The historical endpoint's hosted availability remains an external
risk. Existing archives are not silently refetched to add missing provider IDs.

## Validation, migration and recovery

- STRICT SQL tables enforce types, foreign keys, valid dates, bounded half-win
  odds, unique identities, distinct opponents and nonnegative, non-tied scores.
- Domain checks enforce chronology, candidate cutoffs, asset availability,
  historical-name intervals, game identities/provider-ID uniqueness, complete
  archives and the existing lifecycle conventions (15-day archival grace,
  at most one unfinished season, next season within 90 days).
- Date checks can refuse a build, but never silently select a different season
  or mutate data. Latest/archived UI selection is data-driven.
- `mise run data -- migrate` applies numbered migrations transactionally. Back up
  the DB first. A newer/partial schema history fails loudly. Builds do not silently
  migrate old canonical dumps: migrate locally, dump, review and commit.
- To discard scratch edits: stop dev, move `data/tracker.db` to a backup outside
  the checkout, run `data:restore`, then restart dev. Never delete the canonical
  dump. Do not copy a DB while an editor has an active transaction/WAL.

## Enforcement and regression coverage

`data/runtime-boundary.ts` rejects `data/node/`, the archive facade and native
SQLite imports outside `prerender`. It checks actual dev loading, transformed
imports (Vite can externalize builtins before resolve hooks), and build graphs.
One component can work statically and fail when deferred; filenames and
`import.meta.env.SSR` are not the boundary. Node maintenance/test code is allowed.
This is an architectural guardrail, not a sandbox against disguised imports.

Final artifact auditing rejects DB/SQL files, SQL machinery, changed/unreported
chunks and archived game identities in Worker code. The sealed inventory lives
in `dist/data-audit.json`, outside deployable directories. Recheck with
`mise x -- node data/node/audit.ts`. Rendered chart values in static HTML are
intentional; a whole games database in the Worker is not.

Tests restore fresh SQL every time. Historical golden hashes record approved
pre-migration games and all 269 chart series, rules, records and historical names.
Intentional corrections to those archives require reviewing the golden update;
new seasons after 2025 do not invalidate it. Typed mocks substitute plain catalog
methods, not a miniature Astro content framework. See `tests/README.md`.
