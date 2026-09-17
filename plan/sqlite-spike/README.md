# SQLite pilot: review and data-management guide

**This is a disposable compatibility spike, not the site's new data source.**
The real pages, content collections, NBA loader, actions and KV behavior remain
unchanged. Do not start maintaining production odds in this database yet.
The integration is enabled only by `prepare.mjs` in an external copy.

## What worked

| Context              | Archived games                          | Team/season metadata                      |
| -------------------- | --------------------------------------- | ----------------------------------------- |
| Dev prerendered page | Read-only Node SQLite queries           | Read-only Node SQLite queries             |
| Build prerender      | Fresh SQLite restored from the SQL dump | Same restored snapshot                    |
| Workerd island, dev  | Archived fixture supplied as props      | Generated module; explicit refresh signal |
| Built Worker island  | Archived fixture supplied as props      | Fixed, embedded metadata; no SQLite       |

The intended eventual live path supplies games from the existing NBA/KV path,
not SQLite. The pilot deliberately uses Charlotte's 82 archived 2025–26 games
and makes no NBA requests or KV changes.

The dump retains 18,607 games, 35 teams, 30 seasons and 269 team seasons. All
metadata is only **19,256 JSON bytes**; keep all teams/seasons/team seasons for
now, including opponents and historical action-validation lookups. Games are
not part of the embedded metadata module.

**Important control:** changing only Cloudflare's
`prerenderEnvironment: "node"`, without any SQLite code, already reduces warm
Stats TTFB from about 1,404 to 116 ms and team TTFB from 621 to 5 ms in the
frozen comparison. SQLite's relational workflow is an independent benefit,
not a prerequisite for fixing this dev regression. See
[results and limitations](../new-season-sweep/prelaunch-review/sqlite-pilot.md).

## Open the review copies

- SQLite archive: <http://127.0.0.1:4329/sqlite-spike/archive/>
- Metadata-backed island: <http://127.0.0.1:4329/sqlite-spike/island/>
- Built equivalents: replace `4329` with `4330`.
- Configuration-only control, original UI: <http://127.0.0.1:4331/stats/>
  and <http://127.0.0.1:4331/2025/CHA/>.
- Unchanged workerd reference: ports `4321` (dev) and `4322` (built).

The SQLite copy's directory is recorded in
`/tmp/nbastt-sqlite-pilot-path.txt`; PIDs are in
`/tmp/nbastt-sqlite-pids.json`. These temporary servers are not deployments.

Both pilot pages should show **44–38**, **27.5 odds**, **38 wins to surprise**,
and the same 82 chart points as the reference team page. The latest-season
metadata check should say **2026 / not entered**. All fictitious 2026 odds
used in testing were removed.

## Data ownership and files

- `data/tracker.db`: ignored working database, never a deployment input.
- `data/dump.sql`: canonical, deterministic SQL snapshot intended for Git.
- `schema.sql`: prototype schema version 1, used for the one-time JSON import.
- `data.ts`: explicit restore/dump/odds/inspection commands.
- `database.ts`: Node-only driver, SQL and serialization.
- `catalog.ts`: plain domain records and calculations; no Astro collections.
- `integration.ts`: environment-specific virtual modules and bundle gate.

Node 26.8.1 supplies SQLite 3.53.4 through `node:sqlite`; no new dependency or
system SQLite executable is required. Mise still owns the tool versions.
The root `.gitignore` was not modified by this work; this directory has its
own narrowly scoped ignore file for runtime DB files.

Restore refuses an existing destination. Dumps use a consistent read
transaction, primary-key ordering, SQL string escaping and complete buffered
output followed by rename. Foreign keys, strict column types, primary keys,
date checks and bounded half-win odds reject invalid writes. Odds are stored
as integer half-wins: `51` means `25.5`, but CLI input is ordinary wins.

## Practice adding odds safely

Run these **from the main repository**. This exercise uses a separate scratch
DB, never the site's JSON, the review server DB or the canonical dump.
**25.5 and 26.5 below are fictional examples, not published odds.**

```sh
PRACTICE=$(mktemp -d)
mise run data -- restore --db "$PRACTICE/practice.db"
mise run data -- list-team-seasons --db "$PRACTICE/practice.db" --season 2026

mise run data -- add-team-season --db "$PRACTICE/practice.db" \
  --season 2026 --team CHA --over-under 25.5
mise run data -- list-team-seasons --db "$PRACTICE/practice.db" --season 2026

# Intentional correction; add-team-season never silently replaces a row.
mise run data -- update-odds --db "$PRACTICE/practice.db" \
  --season 2026 --team CHA --over-under 26.5

mise run data -- validate --db "$PRACTICE/practice.db"
mise run data -- dump --db "$PRACTICE/practice.db" --dump "$PRACTICE/dump.sql"
git diff --no-index -- plan/sqlite-spike/data/dump.sql "$PRACTICE/dump.sql"
```

The diff command exits 1 when it finds the expected new row; that is normal.
Repeating `add-team-season`, using an unknown team/season, or entering `25.25`
should fail without changing data. `update-odds` fails if the row is absent.
Season IDs are the **starting year**: `2026` means 2026–27, not calendar 2027.
The 2026 season and existing team IDs are already present.

For actual data, use the published line and confirm candidate eligibility
(current standard-season cutoff: 36 wins), source and season. The CLI validates
IDs and numeric storage, not publication authenticity or eligibility. A future
season-entry command and broader editing workflow are not implemented yet.

After a full migration, the normal worktree loop would be: edit DB → inspect
rows → dump → review SQL diff → stage dump → run checks → commit. For the
prototype those commands are `mise run data:dump`, `mise run data:check`,
`git diff -- plan/sqlite-spike/data/dump.sql`, then `git add` for that file.
**Do not apply this as a production maintenance process until migration is
approved:** the parity tests intentionally require the pilot baseline to
match the still-authoritative JSON.

## Drift and staged-data checks

- `mise run data:check` compares the local DB with the working dump.
- Pre-commit additionally runs `data.ts check-staged`, which reads the actual
  Git index blob using `git show :plan/sqlite-spike/data/dump.sql`.
- Thus dumping but forgetting to re-stage fails, even if the working dump is
  fresh. This pass → fail → pass case is covered with a real temporary Git
  repository in the tests.
- No local DB means only the drift comparison is skipped. Tests still restore
  and validate the dump, check round-trip bytes and compare the complete
  source dataset. Nothing silently creates a DB during a check.

## Dev refresh versus a fixed production snapshot

Supported odds commands write a `.db.revision` signal after a successful
transaction. The integration invalidates the dev catalog module and reloads
connected clients. Database, journal, WAL and shared-memory files themselves
are excluded from source watching—not from verification—to avoid accidental
HMR from SQLite I/O.

For an external SQL editor, enable foreign keys on that connection, commit,
then run `mise run data:notify` **in the prepared copy**, or from the main repo:

```sh
COPY=$(< /tmp/nbastt-sqlite-pilot-path.txt)
mise x -- node "$COPY/plan/sqlite-spike/data.ts" notify
```

Observed: an external edit was immediately visible to the Node page, while
the already-loaded Worker metadata stayed unchanged. Notification refreshed
the open island automatically. The built preview stayed unchanged throughout.
Always notify after external edits; unrelated source HMR is not a data-refresh
contract. Short-lived read-only Node connections avoid stale handles after DB
replacement. Stop dev before restoring/replacing a DB or running build/check
commands in that same copy.

A build restores a **fresh temporary DB from `data/dump.sql`**, ignoring the
working DB. Locally this means the working-tree dump bytes; a clean deployment
checkout supplies the committed bytes. We verified both a deliberately
different local DB and a successful build with no local DB at all. The build
snapshot is removed when the successful build finishes; a failed build may
leave an isolated `nbastt-sqlite-build-*` temp directory for diagnosis.

## Verify that SQLite does not ship

In the prepared copy, using the pinned tools:

```sh
# Stop that copy's dev server first. Do not modify the reference servers.
pnpm exec wrangler types
pnpm run verify
pnpm exec astro build && node plan/sqlite-spike/audit.mjs dist
```

Use `mise x --` for these commands after trusting that copy's inspected Mise
configuration, or invoke them with the tool environment from the main repo.
Do not bypass the package-manager version check.

The integration resolves catalog imports differently for Node prerender and
workerd. Archive SQL imports outside Node prerender fail. It examines the
actual Worker/browser module graphs and emitted code for `node:sqlite`, the
Node database module and its marker. The independent audit then verifies
final chunk hashes, scans final HTML/JS/source maps, and rejects DB/SQL files
under the deployable client/server directories. Audit reports live beside,
not inside, those deployment directories.

The final build has **74 Worker chunks and 9 separate browser chunks**, all
passing. Astro inlines some browser entries and rewrites its manifest after
bundling, so hashes are sealed after those transformations; final HTML is
also scanned. A deliberately injected Worker SQLite import failed the graph
gate. Modifying a copied emitted chunk failed the independent hash check.

This is proof about the pilot's known SQLite boundary, not arbitrary future
drivers. Extend the policy if the driver changes. It is also **not** a claim
that no archived data exists in this partial build: the old Astro content
store remains, and the diagnostic island receives 82 fixture games as props.
Only small metadata belongs to the new embedded catalog. Real live games
would continue to arrive through KV/NBA, not that catalog.

## Manual browser checklist

1. Open both pilot pages and their built equivalents. Confirm the backend
   labels, expected record/odds, 82 points, and no lingering loading fallback.
2. Compare the chart with `http://127.0.0.1:4322/2025/CHA/`. Hover/focus points;
   try arrows, Home, End and Escape. Resize to a narrow viewport. The pilot
   shell is diagnostic, not a replacement layout/parity sign-off.
3. In Network, reload the island page. Each visit should fetch the island
   anew, return 200, and carry `Cache-Control: no-store`.
4. Check Console for errors and Network for failed JS/font/image requests.
5. Compare original Stats/team pages on `4321` versus the configuration-only
   `4331` control. Separate document waiting from chart drawing/animation.
6. For a scripted semantic/keyboard/cache check, from the main repo run:

   ```sh
   mise x -- node plan/baseline/check-sqlite-pilot.mjs --out /tmp/new-sqlite-check.json
   ```

   The output path must be new. This checks every plotted value and threshold,
   the logical emoji, End-key selection, fallback removal, and browser errors.
   It intentionally ignores parent-specific Astro scope attributes and dev
   versus built asset URLs. Its slider-plus-two-frames marker is not animation
   completion, and one first visit is not a cold-start distribution.

Screen-reader review, hosted KV/Sentry/feed observations and production visual
approval remain separate tasks.

## Reproduce in another copy

Create an external Git archive/worktree of the checkpoint, install its locked
dependencies (no symlink to another copy's `node_modules`), then from the main
repo run `mise x -- node plan/sqlite-spike/prepare.mjs /absolute/copy`.
The generator refuses the main repo, a non-tracker project and repeat setup;
it formats/lints only its generated pages/config using the copy's installed
tools. Restore that copy's DB explicitly before dev. Generate Worker types
before checks. Build needs the dump, not the local DB. Use unused ports.

No app migration, package upgrade, font experiment, chart-library change,
push, merge, deployment or production binding change is part of this spike.
Before full migration: finalize schema/migrations (including the optional NBA
ID contract), preserve the remaining domain/completeness/asset validations,
audit latest-only actions/opponents, replace every collection consumer, remove
the duplicate data source, and repeat full route/build/visual verification.
